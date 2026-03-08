import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner@2.0.3";
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
  X
} from "lucide-react";

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

// Mock knowledge base data
const mockKnowledgeData: KnowledgeFolder[] = [
  {
    id: 'warranty',
    name: 'Chính sách bảo hành',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'laptop-warranty',
        name: 'Bảo hành Laptop',
        type: 'folder',
        isOpen: false,
        children: [
          {
            id: 'art-1',
            title: 'Quy trình bảo hành laptop gaming',
            content: `# Quy trình bảo hành laptop gaming

## 1. Điều kiện bảo hành
- Sản phẩm còn trong thời gian bảo hành (12 tháng)
- Có hóa đơn mua hàng và tem bảo hành
- Lỗi do nhà sản xuất, không phải do người dùng

## 2. Quy trình tiếp nhận
1. Khách hàng mang sản phẩm đến trung tâm bảo hành
2. Xuất trình hóa đơn và tem bảo hành
3. Kỹ thuật viên kiểm tra sơ bộ
4. Tạo phiếu tiếp nhận và báo thời gian xử lý

## 3. Thời gian xử lý
- Lỗi nhỏ: 1-2 ngày làm việc
- Lỗi phức tạp: 3-5 ngày làm việc
- Đổi sản phẩm: 7-10 ngày làm việc

## 4. Trường hợp đổi sản phẩm mới
- Sản phẩm bị lỗi nghiêm trọng không sửa được
- Sửa chữa quá 3 lần cho cùng một lỗi
- Thời gian sửa chữa vượt quá 30 ngày

## 5. Liên hệ hỗ trợ
- Hotline: 1900-1234
- Email: warranty@company.com
- Website: support.company.com`,
            summary: 'Hướng dẫn chi tiết quy trình bảo hành laptop gaming, điều kiện và thời gian xử lý.',
            category: 'Bảo hành',
            tags: ['laptop', 'gaming', 'warranty', 'quy-trinh'],
            author: 'Agent Mai',
            lastUpdated: '2025-07-30',
            views: 245,
            isBookmarked: true,
            rating: 4.8,
            path: ['Chính sách bảo hành', 'Bảo hành Laptop'],
            type: 'article'
          } as KnowledgeArticle,
          {
            id: 'art-2',
            title: 'Trung tâm bảo hành toàn quốc',
            content: `# Danh sách trung tâm bảo hành toàn quốc

## Miền Bắc

### Hà Nội
**Trung tâm bảo hành Hà Nội**
- Địa chỉ: 123 Đường ABC, Quận Ba Đình, Hà Nội
- Điện thoại: (024) 1234-5678
- Giờ làm việc: 8:00-17:00 (Thứ 2-CN)
- Email: hanoi@warranty.com

**Chi nhánh Cầu Giấy**
- Địa chỉ: 456 Đường XYZ, Quận Cầu Giấy, Hà Nội
- Điện thoại: (024) 8765-4321
- Giờ làm việc: 8:00-17:00 (Thứ 2-CN)

## Miền Trung

### Đà Nẵng
**Trung tâm bảo hành Đà Nẵng**
- Địa chỉ: 789 Đường DEF, Quận Hải Châu, Đà Nẵng
- Điện thoại: (0236) 1111-2222
- Giờ làm việc: 8:00-17:00 (Thứ 2-CN)

## Miền Nam

### TP. Hồ Chí Minh
**Trung tâm bảo hành TP.HCM**
- Địa chỉ: 321 Đường GHI, Quận 1, TP.HCM
- Điện thoại: (028) 3333-4444
- Giờ làm việc: 8:00-17:00 (Thứ 2-CN)
- Email: hcm@warranty.com

**Chi nhánh Quận 7**
- Địa chỉ: 654 Đường JKL, Quận 7, TP.HCM
- Điện thoại: (028) 5555-6666
- Giờ làm việc: 8:00-17:00 (Thứ 2-CN)`,
            summary: 'Danh sách đầy đủ các trung tâm bảo hành trên toàn quốc với địa chỉ và thông tin liên hệ.',
            category: 'Bảo hành',
            tags: ['trung-tam', 'dia-chi', 'lien-he', 'bao-hanh'],
            author: 'Agent Duc',
            lastUpdated: '2025-08-01',
            views: 189,
            isBookmarked: false,
            rating: 4.5,
            path: ['Chính sách bảo hành', 'Bảo hành Laptop'],
            type: 'article'
          } as KnowledgeArticle
        ]
      }
    ]
  },
  {
    id: 'customer-service',
    name: 'Dịch vụ khách hàng',
    type: 'folder',
    isOpen: false,
    children: [
      {
        id: 'returns',
        name: 'Đổi trả sản phẩm',
        type: 'folder',
        isOpen: false,
        children: [
          {
            id: 'art-3',
            title: 'Chính sách đổi trả 30 ngày',
            content: `# Chính sách đổi trả 30 ngày

## Điều kiện đổi trả
- Sản phẩm còn trong thời gian 30 ngày kể từ ngày mua
- Sản phẩm chưa sử dụng, còn nguyên tem và bao bì
- Có hóa đơn mua hàng hoặc biên lai

## Quy trình đổi trả
1. Liên hệ bộ phận CSKH qua hotline hoặc email
2. Cung cấp thông tin đơn hàng và lý do đổi trả
3. Nhận mã RMA (Return Authorization)
4. Gửi sản phẩm về kho hoặc mang đến cửa hàng
5. Kiểm tra sản phẩm và xử lý đổi trả

## Phí đổi trả
- Lỗi do nhà sản xuất: Miễn phí
- Lỗi do vận chuyển: Miễn phí
- Đổi ý cá nhân: Khách hàng chịu phí vận chuyển

## Thời gian xử lý
- Hoàn tiền: 3-5 ngày làm việc
- Đổi sản phẩm: 5-7 ngày làm việc`,
            summary: 'Chi tiết chính sách đổi trả sản phẩm trong vòng 30 ngày với điều kiện và quy trình.',
            category: 'Đổi trả',
            tags: ['doi-tra', '30-ngay', 'chinh-sach', 'hoan-tien'],
            author: 'Agent Linh',
            lastUpdated: '2025-07-25',
            views: 156,
            isBookmarked: true,
            rating: 4.7,
            path: ['Dịch vụ khách hàng', 'Đổi trả sản phẩm'],
            type: 'article'
          } as KnowledgeArticle
        ]
      }
    ]
  },
  {
    id: 'technical',
    name: 'Hỗ trợ kỹ thuật',
    type: 'folder',
    isOpen: false,
    children: [
      {
        id: 'troubleshooting',
        name: 'Xử lý sự cố',
        type: 'folder',
        isOpen: false,
        children: [
          {
            id: 'art-4',
            title: 'Xử lý lỗi màn hình laptop nhấp nháy',
            content: `# Xử lý lỗi màn hình laptop nhấp nháy

## Nguyên nhân thường gặp
1. **Driver card đồ họa lỗi thời**
   - Driver cũ hoặc không tương thích
   - Driver bị lỗi sau khi update Windows

2. **Vấn đề phần cứng**
   - Cable màn hình lỏng lẻo
   - Card đồ họa bị hỏng
   - RAM bị lỗi

3. **Cài đặt màn hình không phù hợp**
   - Tần số quét không đúng
   - Độ phân giải không được hỗ trợ

## Cách khắc phục

### Bước 1: Cập nhật driver
1. Mở Device Manager (Windows + X, chọn Device Manager)
2. Mở rộng "Display adapters"
3. Right-click card đồ họa và chọn "Update driver"
4. Chọn "Search automatically for drivers"
5. Restart máy tính

### Bước 2: Kiểm tra cài đặt màn hình
1. Right-click desktop và chọn "Display settings"
2. Kiểm tra resolution và refresh rate
3. Thử giảm resolution hoặc refresh rate
4. Test với màn hình ngoài để xác định vấn đề

### Bước 3: Reset BIOS
1. Restart máy và nhấn F2/F10/Del để vào BIOS
2. Tìm option "Load Default Settings"
3. Save và Exit

### Bước 4: Kiểm tra phần cứng
- Nếu vẫn lỗi, có thể cần thay cable màn hình
- Hoặc card đồ họa cần được kiểm tra

## Khi nào cần liên hệ kỹ thuật
- Đã thử tất cả cách trên nhưng vẫn lỗi
- Màn hình có vết nứt hoặc đốm sáng
- Laptop còn bảo hành`,
            summary: 'Hướng dẫn chi tiết xử lý lỗi màn hình laptop nhấp nháy với các bước khắc phục từ cơ bản đến nâng cao.',
            category: 'Kỹ thuật',
            tags: ['man-hinh', 'nhap-nhay', 'laptop', 'troubleshooting'],
            author: 'Agent Tech',
            lastUpdated: '2025-08-01',
            views: 320,
            isBookmarked: false,
            rating: 4.9,
            path: ['Hỗ trợ kỹ thuật', 'Xử lý sự cố'],
            type: 'article'
          } as KnowledgeArticle
        ]
      }
    ]
  }
];

// Recent searches and bookmarks
const recentSearches = [
  'bảo hành laptop',
  'đổi trả sản phẩm',
  'màn hình nhấp nháy',
  'trung tâm bảo hành',
  'chính sách 30 ngày'
];

const bookmarkedArticles = mockKnowledgeData
  .flatMap(folder => getAllArticles(folder))
  .filter(article => article.isBookmarked);

function getAllArticles(folder: KnowledgeFolder): KnowledgeArticle[] {
  const articles: KnowledgeArticle[] = [];
  
  folder.children.forEach(child => {
    if (child.type === 'article') {
      articles.push(child as KnowledgeArticle);
    } else {
      articles.push(...getAllArticles(child as KnowledgeFolder));
    }
  });
  
  return articles;
}

interface KnowledgeBaseSearchProps {
  onInsertContent?: (content: string) => void;
  onContentInsert?: (content: string) => void;
}

export function KnowledgeBaseSearch({ onInsertContent, onContentInsert }: KnowledgeBaseSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['warranty']));
  const [activeTab, setActiveTab] = useState('browse');
  const [filterCategory, setFilterCategory] = useState('all');
  const [bookmarkedArticleIds, setBookmarkedArticleIds] = useState<Set<string>>(
    new Set(bookmarkedArticles.map(a => a.id))
  );
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [fullscreenArticle, setFullscreenArticle] = useState<KnowledgeArticle | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['Bảo hành', 'Đổi trả', 'Kỹ thuật']));

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const allArticles = getAllArticles({ 
      id: 'root', 
      name: 'root', 
      type: 'folder', 
      isOpen: true, 
      children: mockKnowledgeData 
    });

    let results = allArticles.filter(article => 
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.content.toLowerCase().includes(query.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
      article.summary.toLowerCase().includes(query.toLowerCase())
    );

    // Apply category filter
    if (filterCategory !== 'all') {
      results = results.filter(article => article.category === filterCategory);
    }

    // Apply selected categories filter
    if (selectedCategories.size > 0 && selectedCategories.size < 3) {
      results = results.filter(article => selectedCategories.has(article.category));
    }

    setSearchResults(results);
    if (activeTab !== 'search') {
      setActiveTab('search');
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async (content: string, label: string = "Nội dung") => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${label} đã được sao chép vào clipboard`);
    } catch (error) {
      toast.error("Không thể sao chép. Vui lòng thử lại.");
    }
  };

  // Toggle bookmark
  const handleToggleBookmark = (articleId: string) => {
    setBookmarkedArticleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
        toast.info("Đã bỏ lưu bài viết");
      } else {
        newSet.add(articleId);
        toast.success("Đã lưu bài viết vào mục yêu thích");
      }
      return newSet;
    });
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
    if (searchQuery) {
      handleSearch(searchQuery);
    }
    toast.success("Đã áp dụng bộ lọc");
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
      <div key={folder.id} className={`ml-${level * 4}`}>
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
                {renderFolderTree(folder.children as KnowledgeFolder[], level + 1)}
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex items-center space-x-2 p-2 hover:bg-blue-50 cursor-pointer rounded"
            onClick={() => setSelectedArticle(folder as KnowledgeArticle)}
          >
            <BookOpen className="h-4 w-4 text-green-600" />
            <span className="text-sm">{(folder as KnowledgeArticle).title}</span>
            {isArticleBookmarked((folder as KnowledgeArticle).id) && (
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
                <span className="text-xs text-muted-foreground">+{article.tags.length - 3} more</span>
              )}
            </div>
            <div className="flex items-center space-x-1 text-yellow-500">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-xs">{article.rating}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Insert content handler
  const handleInsertContent = (content: string, label: string = "Nội dung") => {
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
    return bookmarkedArticleIds.has(articleId);
  };

  // Get filtered articles based on current settings
  const getFilteredArticles = () => {
    const allArticles = getAllArticles({ 
      id: 'root', 
      name: 'root', 
      type: 'folder', 
      isOpen: true, 
      children: mockKnowledgeData 
    });

    let filtered = allArticles;

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(article => article.category === filterCategory);
    }

    // Apply selected categories filter
    if (selectedCategories.size > 0 && selectedCategories.size < 3) {
      filtered = filtered.filter(article => selectedCategories.has(article.category));
    }

    return filtered;
  };

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
                  {selectedCategories.size < 3 && (
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
                      {['Bảo hành', 'Đổi trả', 'Kỹ thuật'].map(category => (
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
                        setSelectedCategories(new Set(['Bảo hành', 'Đổi trả', 'Kỹ thuật']));
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
            {['all', 'Bảo hành', 'Đổi trả', 'Kỹ thuật'].map(category => (
              <Button
                key={category}
                variant={filterCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilterCategory(category)}
                className="text-xs"
              >
                {category === 'all' ? 'Tất cả' : category}
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
            <TabsTrigger value="recent" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500">
              <Clock className="h-4 w-4 mr-2" />
              Gần đây
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2">
              {renderFolderTree(mockKnowledgeData)}
            </div>
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
                <div className="mt-4">
                  <p className="text-sm mb-2">Tìm kiếm gần đây:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {recentSearches.map(search => (
                      <Button
                        key={search}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(search)}
                        className="text-xs"
                      >
                        {search}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="flex-1 p-4 overflow-y-auto">
            <div className="grid gap-3">
              {getFilteredArticles()
                .filter(article => isArticleBookmarked(article.id))
                .map(renderArticleCard)}
              {getFilteredArticles().filter(article => isArticleBookmarked(article.id)).length === 0 && (
                <div className="text-center text-muted-foreground mt-8">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Chưa có bài viết được lưu</p>
                  <p className="text-sm mt-2">Nhấn vào biểu tượng bookmark để lưu bài viết yêu thích</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Bài viết đã xem gần đây
                </h4>
                <div className="grid gap-3">
                  {getAllArticles({ 
                    id: 'root', 
                    name: 'root', 
                    type: 'folder', 
                    isOpen: true, 
                    children: mockKnowledgeData 
                  }).slice(0, 3).map(renderArticleCard)}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Search className="h-4 w-4 mr-2" />
                  Tìm kiếm gần đây
                </h4>
                <div className="space-y-2">
                  {recentSearches.map(search => (
                    <div key={search} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">{search}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSearch(search)}
                        className="text-xs"
                      >
                        Tìm lại
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Article Detail Panel */}
      {selectedArticle && (
        <div className="w-96 border-l border-border bg-background flex flex-col">
          {/* Article Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-sm line-clamp-2">{selectedArticle.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedArticle(null)}
                className="h-6 w-6 p-0 ml-2"
              >
                ×
              </Button>
            </div>
            
            {/* Breadcrumb */}
            <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-2">
              {selectedArticle.path.map((pathItem, index) => (
                <div key={index} className="flex items-center space-x-1">
                  {index > 0 && <ChevronRight className="h-3 w-3" />}
                  <span>{pathItem}</span>
                </div>
              ))}
            </div>
            
            {/* Metadata */}
            <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{selectedArticle.author}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{selectedArticle.lastUpdated}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{selectedArticle.views}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedArticle.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInsertContent(selectedArticle.content, "Toàn bộ nội dung");
                }}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Chèn nội dung
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyToClipboard(selectedArticle.content, "Nội dung bài viết");
                }}
                title="Sao chép nội dung"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenFullscreen(selectedArticle);
                }}
                title="Mở toàn màn hình"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button 
                variant={isArticleBookmarked(selectedArticle.id) ? "default" : "outline"} 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleBookmark(selectedArticle.id);
                }}
                title={isArticleBookmarked(selectedArticle.id) ? "Bỏ lưu" : "Lưu bài viết"}
              >
                <Bookmark className={`h-4 w-4 ${isArticleBookmarked(selectedArticle.id) ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Article Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {selectedArticle.content}
              </div>
            </div>
          </div>

          {/* Quick Insert Options */}
          <div className="p-4 border-t border-border bg-muted/50">
            <h4 className="text-xs font-medium mb-2">Chèn nhanh:</h4>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInsertContent(selectedArticle.summary, "Tóm tắt");
                }}
                className="w-full justify-start text-xs hover:bg-blue-50"
              >
                <Plus className="h-3 w-3 mr-2" />
                Tóm tắt
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const sections = selectedArticle.content.split('\n## ').slice(1);
                  if (sections.length > 0) {
                    handleInsertContent(`## ${sections[0]}`, "Phần đầu tiên");
                  } else {
                    toast.info("Không tìm thấy phần nào để chèn");
                  }
                }}
                className="w-full justify-start text-xs hover:bg-blue-50"
              >
                <Plus className="h-3 w-3 mr-2" />
                Phần đầu tiên
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Extract contact info or important links
                  const lines = selectedArticle.content.split('\n');
                  const contacts = lines.filter(line => 
                    line.includes('Hotline') || 
                    line.includes('Email') || 
                    line.includes('Website')
                  );
                  if (contacts.length > 0) {
                    handleInsertContent(contacts.join('\n'), "Thông tin liên hệ");
                  } else {
                    toast.info("Không tìm thấy thông tin liên hệ");
                  }
                }}
                className="w-full justify-start text-xs hover:bg-blue-50"
              >
                <Plus className="h-3 w-3 mr-2" />
                Thông tin liên hệ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Article Dialog */}
      <Dialog open={!!fullscreenArticle} onOpenChange={(open) => !open && setFullscreenArticle(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col" aria-describedby={undefined}>
          {fullscreenArticle && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <DialogTitle className="text-lg">{fullscreenArticle.title}</DialogTitle>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-2">
                      {fullscreenArticle.path.map((pathItem, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          {index > 0 && <ChevronRight className="h-3 w-3" />}
                          <span>{pathItem}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(fullscreenArticle.content, "Nội dung bài viết")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Sao chép
                    </Button>
                    <Button
                      variant={isArticleBookmarked(fullscreenArticle.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleBookmark(fullscreenArticle.id)}
                    >
                      <Bookmark className={`h-4 w-4 mr-1 ${isArticleBookmarked(fullscreenArticle.id) ? 'fill-current' : ''}`} />
                      {isArticleBookmarked(fullscreenArticle.id) ? 'Đã lưu' : 'Lưu'}
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Metadata Bar */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{fullscreenArticle.author}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{fullscreenArticle.lastUpdated}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{fullscreenArticle.views} lượt xem</span>
                  </div>
                  <div className="flex items-center space-x-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{fullscreenArticle.rating}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {fullscreenArticle.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {fullscreenArticle.content}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInsertContent(fullscreenArticle.summary, "Tóm tắt")}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Chèn tóm tắt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const sections = fullscreenArticle.content.split('\n## ').slice(1);
                      if (sections.length > 0) {
                        handleInsertContent(`## ${sections[0]}`, "Phần đầu tiên");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Chèn phần đầu
                  </Button>
                </div>
                <Button
                  onClick={() => handleInsertContent(fullscreenArticle.content, "Toàn bộ nội dung")}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Chèn toàn bộ nội dung
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}