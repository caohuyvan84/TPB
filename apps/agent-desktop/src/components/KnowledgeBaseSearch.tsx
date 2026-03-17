import { useState, useMemo } from "react";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from "sonner";
import {
  Search,
  BookOpen,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Star,
  Clock,
  Eye,
  Copy,
  ExternalLink,
  Filter,
  MoreVertical,
  Plus,
  History,
  Bookmark,
  Tag,
  Calendar,
  User,
  Check,
  X,
  Loader2
} from "lucide-react";
import { useKbArticles, useKbBookmarks, useBookmarkArticle, useRateArticle } from '../hooks/useKnowledge';
import { KbArticle } from '../lib/knowledge-api';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  author: string;
  lastUpdated: string;
  views: number;
  isBookmarked: boolean;
  rating: number;
  path: string[];
}

interface KnowledgeFolder {
  id: string;
  name: string;
  children: (KnowledgeFolder | KnowledgeArticle)[];
  isOpen: boolean;
  type: 'folder' | 'article';
}

interface KnowledgeBaseSearchProps {
  onInsertContent?: (content: string) => void;
  onContentInsert?: (content: string) => void;
}

// Transform API articles into folder tree structure
function buildFolderTree(articles: KbArticle[], bookmarkedIds: Set<string>): KnowledgeFolder[] {
  const categoryMap = new Map<string, KnowledgeArticle[]>();

  articles.forEach((article) => {
    const cat = article.category || 'General';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);

    const knowledgeArticle: KnowledgeArticle = {
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary || '',
      category: article.category || '',
      tags: article.tags || [],
      author: article.createdBy,
      lastUpdated: article.updatedAt ? new Date(article.updatedAt).toLocaleDateString('vi-VN') : '',
      views: article.viewCount || 0,
      isBookmarked: bookmarkedIds.has(article.id),
      rating: Number(article.rating) || 0,
      path: [cat]
    };

    categoryMap.get(cat)!.push(knowledgeArticle);
  });

  return Array.from(categoryMap.entries()).map(([name, articles]) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    type: 'folder' as const,
    isOpen: true,
    children: articles.map(a => ({ ...a, type: 'article' as const }))
  }));
}

function getAllArticles(folder: KnowledgeFolder): KnowledgeArticle[] {
  const articles: KnowledgeArticle[] = [];

  folder.children.forEach(child => {
    if ('content' in child) {
      articles.push(child as KnowledgeArticle);
    } else {
      articles.push(...getAllArticles(child as KnowledgeFolder));
    }
  });

  return articles;
}

export function KnowledgeBaseSearch({ onInsertContent, onContentInsert }: KnowledgeBaseSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['general']));
  const [activeTab, setActiveTab] = useState('browse');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [fullscreenArticle, setFullscreenArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // API hooks
  const { data: articlesData, isLoading: articlesLoading } = useKbArticles({ query: searchQuery || undefined });
  const { data: bookmarksData = [] } = useKbBookmarks();
  const bookmarkMutation = useBookmarkArticle();
  const rateMutation = useRateArticle();

  // Build bookmarked IDs set — stable reference
  const bookmarkedIds = useMemo(
    () => new Set(bookmarksData.map(b => b.articleId)),
    [bookmarksData]
  );

  // Build folder tree from API data — stable reference
  const articles = articlesData?.data || [];
  const folderTree = useMemo(
    () => buildFolderTree(articles, bookmarkedIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [articlesData, bookmarkedIds]
  );
  const allArticles = useMemo(
    () => folderTree.flatMap(f => getAllArticles(f)),
    [folderTree]
  );


  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && activeTab !== 'search') {
      setActiveTab('search');
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async (content: string, label = "Nội dung") => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${label} đã được sao chép vào clipboard`);
    } catch (error) {
      toast.error("Không thể sao chép. Vui lòng thử lại.");
    }
  };

  // Toggle bookmark
  const handleToggleBookmark = async (articleId: string) => {
    try {
      await bookmarkMutation.mutateAsync(articleId);
      toast.success("Đã cập nhật bài viết được lưu");
    } catch (error) {
      toast.error("Không thể cập nhật bookmark. Vui lòng thử lại.");
    }
  };

  // Rate article
  const handleRateArticle = async (articleId: string, rating: number) => {
    try {
      await rateMutation.mutateAsync({ id: articleId, rating });
      toast.success("Cảm ơn bạn đã đánh giá bài viết");
    } catch (error) {
      toast.error("Không thể lưu đánh giá. Vui lòng thử lại.");
    }
  };

  // Open in fullscreen
  const handleOpenFullscreen = (article: KnowledgeArticle) => {
    setFullscreenArticle(article);
  };

  // Toggle category filter
  const handleToggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Apply filters
  const applyFilters = () => {
    setFilterDialogOpen(false);
  };

  // Folder toggle
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Render folder tree
  const renderFolderTree = (folders: KnowledgeFolder[], level = 0) => {
    return folders.map(folder => (
      <div key={folder.id}>
        {folder.type === 'folder' ? (
          <div>
            <div
              className="flex items-center space-x-2 p-2 hover:bg-muted/50 cursor-pointer rounded"
              onClick={() => toggleFolder(folder.id)}
            >
              {expandedFolders.has(folder.id) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {expandedFolders.has(folder.id) ? (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              ) : (
                <Folder className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-sm font-medium">{folder.name}</span>
            </div>
            {expandedFolders.has(folder.id) && (
              <div className="ml-6">
                {renderFolderTree(folder.children as KnowledgeFolder[])}
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex items-center space-x-2 p-2 hover:bg-blue-50 cursor-pointer rounded"
            onClick={() => setSelectedArticle(folder as unknown as KnowledgeArticle)}
          >
            <BookOpen className="h-4 w-4 text-green-600" />
            <span className="text-sm flex-1">{(folder as unknown as KnowledgeArticle).title}</span>
            {isArticleBookmarked((folder as unknown as KnowledgeArticle).id) && (
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
            )}
          </div>
        )}
      </div>
    ));
  };

  // Render article card
  const renderArticleCard = (article: KnowledgeArticle) => {
    const isBookmarked = isArticleBookmarked(article.id);

    return (
      <Card
        key={article.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedArticle(article)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm line-clamp-2">{article.title}</CardTitle>
              <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                <span>by {article.author}</span>
                <span>•</span>
                <span>{article.lastUpdated}</span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{article.views}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1 ml-2">
              {isBookmarked && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{article.summary}</p>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {article.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                  {tag}
                </Badge>
              ))}
              {article.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">+{article.tags.length - 3}</span>
              )}
            </div>
            <div className="flex items-center space-x-1 text-yellow-500">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-xs">{article.rating.toFixed(1)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Insert content handler
  const handleInsertContent = (content: string, label = "Nội dung") => {
    const insertFn = onInsertContent || onContentInsert;
    if (insertFn) {
      insertFn(content);
      toast.success(`${label} đã được chèn vào nội dung tương tác`);
    } else {
      toast.info("Chức năng chèn nội dung chưa được cấu hình");
    }
  };

  // Check if article is bookmarked
  const isArticleBookmarked = (articleId: string) => {
    return bookmarkedIds.has(articleId);
  };

  const categories = Array.from(new Set(allArticles.map(a => a.category)));

  // Reactive search results — recomputed when query, articles, or filters change
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    let results = allArticles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterCategory !== 'all') {
      results = results.filter(article => article.category === filterCategory);
    }

    if (selectedCategories.size > 0) {
      results = results.filter(article => selectedCategories.has(article.category));
    }

    return results;
  }, [searchQuery, allArticles, filterCategory, selectedCategories]);

  // Filtered folder tree for browse tab
  const filteredFolderTree = useMemo(() => {
    if (filterCategory === 'all' && selectedCategories.size === 0) return folderTree;

    return folderTree.filter(folder => {
      if (filterCategory !== 'all') return folder.name === filterCategory;
      return selectedCategories.has(folder.name);
    });
  }, [folderTree, filterCategory, selectedCategories]);

  return (
    <div className="h-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-border bg-background">
          <div className="flex items-center space-x-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm bài viết, hướng dẫn..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Popover open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Lọc
                  {selectedCategories.size > 0 && (
                    <Badge variant="default" className="ml-2 h-4 px-1 text-xs">
                      {selectedCategories.size}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Lọc theo danh mục</h4>
                    <div className="space-y-2">
                      {categories.map(category => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filter-${category}`}
                            checked={selectedCategories.has(category)}
                            onCheckedChange={() => handleToggleCategoryFilter(category)}
                          />
                          <Label
                            htmlFor={`filter-${category}`}
                            className="text-sm cursor-pointer"
                          >
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCategories(new Set());
                        setFilterCategory('all');
                      }}
                      className="flex-1"
                    >
                      Đặt lại
                    </Button>
                    <Button
                      size="sm"
                      onClick={applyFilters}
                      className="flex-1"
                    >
                      Áp dụng
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick filters */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Danh mục:</span>
            <Button
              variant={filterCategory === 'all' ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterCategory('all')}
              className="text-xs"
            >
              Tất cả
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={filterCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterCategory(category)}
                className="text-xs"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="justify-start border-b rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger value="browse" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500">
              <Folder className="h-4 w-4 mr-2" />
              Duyệt thư mục
            </TabsTrigger>
            <TabsTrigger value="search" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500">
              <Search className="h-4 w-4 mr-2" />
              Kết quả tìm kiếm
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500">
              <Star className="h-4 w-4 mr-2" />
              Đã lưu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="flex-1 p-4 overflow-y-auto">
            {articlesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFolderTree.length === 0 ? (
              <div className="text-center text-muted-foreground mt-8">
                <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Không có bài viết nào trong danh mục này</p>
              </div>
            ) : (
              <div className="space-y-2">
                {renderFolderTree(filteredFolderTree)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="flex-1 p-4 overflow-y-auto">
            {searchQuery ? (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Tìm thấy {searchResults.length} kết quả cho "{searchQuery}"
                  </p>
                </div>
                <div className="grid gap-3">
                  {searchResults.map(renderArticleCard)}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground mt-8">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nhập từ khóa để tìm kiếm bài viết</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="flex-1 p-4 overflow-y-auto">
            <div className="grid gap-3">
              {allArticles
                .filter(article => isArticleBookmarked(article.id))
                .map(renderArticleCard)}
              {allArticles.filter(article => isArticleBookmarked(article.id)).length === 0 && (
                <div className="text-center text-muted-foreground mt-8">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Chưa có bài viết được lưu</p>
                  <p className="text-sm mt-2">Nhấn vào biểu tượng bookmark để lưu bài viết yêu thích</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Article Detail Panel */}
      {selectedArticle && (
        <div className="w-96 border-l border-border bg-background overflow-y-auto">
          <div className="p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm line-clamp-2 flex-1">{selectedArticle.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedArticle(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{selectedArticle.author}</span>
              <span>{selectedArticle.lastUpdated}</span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Summary */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Tóm tắt</p>
              <p className="text-sm">{selectedArticle.summary}</p>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Lượt xem</p>
                <p className="text-sm font-semibold flex items-center">
                  <Eye className="h-3 w-3 mr-1" />
                  {selectedArticle.views}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Danh mục</p>
                <Badge variant="outline" className="text-xs">
                  {selectedArticle.category}
                </Badge>
              </div>
            </div>

            {/* Tags */}
            {selectedArticle.tags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Thẻ</p>
                <div className="flex flex-wrap gap-1">
                  {selectedArticle.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleToggleBookmark(selectedArticle.id)}
                disabled={bookmarkMutation.isPending}
              >
                <Bookmark className={`h-4 w-4 mr-2 ${isArticleBookmarked(selectedArticle.id) ? 'fill-current' : ''}`} />
                {isArticleBookmarked(selectedArticle.id) ? 'Đã lưu' : 'Lưu bài viết'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleCopyToClipboard(selectedArticle.content, 'Nội dung')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Sao chép nội dung
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleInsertContent(selectedArticle.content, 'Bài viết')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Chèn vào tương tác
              </Button>
            </div>

            {/* Content Preview */}
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Nội dung</p>
              <div className="prose prose-sm max-w-none line-clamp-6 text-xs">
                {selectedArticle.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-1">{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
