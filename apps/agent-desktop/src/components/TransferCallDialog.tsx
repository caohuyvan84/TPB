import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Search, User, Phone } from "lucide-react";

interface TransferCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  onTransferCall?: (destination: string, type: 'blind' | 'attended') => Promise<void>;
}

const availableAgents = [
  { id: '1', name: 'Agent Mai', department: 'Technical Support', status: 'available', skills: ['Technical', 'Hardware'] },
  { id: '2', name: 'Agent Linh', department: 'Customer Service', status: 'busy', skills: ['Billing', 'Account'] },
  { id: '3', name: 'Agent Duc', department: 'Sales', status: 'available', skills: ['Sales', 'Product'] },
  { id: '4', name: 'Agent Nga', department: 'Technical Support', status: 'available', skills: ['Software', 'Integration'] }
];

export function TransferCallDialog({ open, onOpenChange, customerName, onTransferCall }: TransferCallDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferType, setTransferType] = useState('warm'); // warm, cold

  const filteredAgents = availableAgents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTransfer = async () => {
    const agent = availableAgents.find(a => a.id === selectedAgent);
    if (!agent) return;

    const sipType = transferType === 'cold' ? 'blind' : 'attended';
    if (onTransferCall) {
      try {
        await onTransferCall(agent.name, sipType);
      } catch (err) {
        console.error('Transfer failed:', err);
      }
    } else {
      console.log('Transferring call:', { to: selectedAgent, type: transferType, note: transferNote });
    }

    setSelectedAgent('');
    setTransferNote('');
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer cuộc gọi</DialogTitle>
          <DialogDescription>
            Chuyển cuộc gọi của khách hàng {customerName} cho agent khác
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Transfer Type */}
          <div>
            <Label>Loại chuyển tiếp</Label>
            <Select value={transferType} onValueChange={setTransferType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warm">Warm Transfer (Giới thiệu trước)</SelectItem>
                <SelectItem value="cold">Cold Transfer (Chuyển trực tiếp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Agents */}
          <div>
            <Label>Tìm agent</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, bộ phận, kỹ năng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Agent List */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                  selectedAgent === agent.id ? 'border-blue-500 bg-blue-50' : 'border-border'
                } ${
                  agent.status !== 'available' ? 'opacity-50' : ''
                }`}
                onClick={() => agent.status === 'available' && setSelectedAgent(agent.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.department}</p>
                    </div>
                  </div>
                  <Badge className={`${
                    agent.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {agent.status === 'available' ? 'Rảnh' : 'Bận'}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {agent.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Transfer Note */}
          <div>
            <Label>Ghi chú chuyển tiếp</Label>
            <Textarea
              placeholder="Thông tin cần truyền đạt cho agent nhận..."
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleTransfer}
            disabled={!selectedAgent}
          >
            <Phone className="h-4 w-4 mr-2" />
            Chuyển cuộc gọi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}