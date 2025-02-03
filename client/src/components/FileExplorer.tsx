import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Folder, File, ChevronRight, ChevronDown, Plus, FileCode } from 'lucide-react';

interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileSystemItem[];
}

interface Props {
  onFileSelect: (content: string) => void;
}

export function FileExplorer({ onFileSelect }: Props) {
  const [items, setItems] = useState<FileSystemItem[]>([
    {
      id: '1',
      name: 'contracts',
      type: 'folder',
      children: [
        {
          id: '2',
          name: 'SimpleStorage.sol',
          type: 'file',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}`
        }
      ]
    }
  ]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1']));
  const [newItemName, setNewItemName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileCreate = (parentId: string | null = null) => {
    if (!newItemName) return;

    const newFile: FileSystemItem = {
      id: Date.now().toString(),
      name: newItemName.endsWith('.sol') ? newItemName : `${newItemName}.sol`,
      type: 'file',
      content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ${newItemName.replace('.sol', '')} {
    // Your contract code here
}`
    };

    setItems(prevItems => {
      const addToItems = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.map(item => {
          if (item.type === 'folder' && (item.id === parentId || parentId === null)) {
            return {
              ...item,
              children: [...(item.children || []), newFile]
            };
          } else if (item.type === 'folder' && item.children) {
            return {
              ...item,
              children: addToItems(item.children)
            };
          }
          return item;
        });
      };
      return addToItems(prevItems);
    });

    setNewItemName('');
    setIsCreatingFile(false);
  };

  const handleFolderCreate = (parentId: string | null = null) => {
    if (!newItemName) return;

    const newFolder: FileSystemItem = {
      id: Date.now().toString(),
      name: newItemName,
      type: 'folder',
      children: []
    };

    setItems(prevItems => {
      const addToItems = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.map(item => {
          if (item.type === 'folder' && (item.id === parentId || parentId === null)) {
            return {
              ...item,
              children: [...(item.children || []), newFolder]
            };
          } else if (item.type === 'folder' && item.children) {
            return {
              ...item,
              children: addToItems(item.children)
            };
          }
          return item;
        });
      };
      return addToItems(prevItems);
    });

    setNewItemName('');
    setExpandedFolders(prev => new Set([...prev, newFolder.id]));
  };

  const renderItem = (item: FileSystemItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);

    return (
      <div key={item.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`flex items-center px-2 py-1 hover:bg-accent cursor-pointer text-sm`}
              style={{ paddingLeft: `${level * 12}px` }}
              onClick={() => {
                if (item.type === 'folder') {
                  toggleFolder(item.id);
                } else if (item.content) {
                  onFileSelect(item.content);
                }
              }}
            >
              {item.type === 'folder' && (
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
              )}
              {item.type === 'folder' ? (
                <Folder className="h-4 w-4 mr-2 text-yellow-500" />
              ) : (
                <FileCode className="h-4 w-4 mr-2 text-blue-500" />
              )}
              <span>{item.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {item.type === 'folder' && (
              <>
                <ContextMenuItem onClick={() => {
                  setSelectedFolder(item.id);
                  setIsCreatingFile(true);
                }}>
                  New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  setSelectedFolder(item.id);
                  setIsCreatingFile(false);
                }}>
                  New Folder
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
        {item.type === 'folder' && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 border-r h-full">
      <div className="p-4 border-b">
        <Dialog open={selectedFolder !== null} onOpenChange={() => setSelectedFolder(null)}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New {isCreatingFile ? 'File' : 'Folder'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New {isCreatingFile ? 'File' : 'Folder'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder={isCreatingFile ? "Contract.sol" : "New Folder"}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <Button 
                className="w-full"
                onClick={() => {
                  if (isCreatingFile) {
                    handleFileCreate(selectedFolder);
                  } else {
                    handleFolderCreate(selectedFolder);
                  }
                  setSelectedFolder(null);
                }}
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-2">
          {items.map(item => renderItem(item))}
        </div>
      </ScrollArea>
    </div>
  );
}
