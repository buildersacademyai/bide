import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Folder, FileCode, ChevronDown, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Contract {
  id: number;
  name: string;
  type: 'file' | 'folder';
  path: string;
  parentId: number | null;
  sourceCode?: string;
  bytecode?: string;
}

interface Props {
  onFileSelect: (content: string, contractId: number) => void;
}

export function FileExplorer({ onFileSelect }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1']));
  const [newItemName, setNewItemName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Contract | null>(null);
  const [itemToRename, setItemToRename] = useState<Contract | null>(null);

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
    select: (data) => data.filter(contract => 
      contract.type === 'folder' || (contract.type === 'file' && !contract.bytecode)
    ),
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to load contracts",
        description: error instanceof Error ? error.message : "Failed to fetch contracts",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newContract: Partial<Contract>) => {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContract),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create item');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: `${isCreatingFile ? 'File' : 'Folder'} created`,
        description: `Successfully created ${newItemName}`,
      });
      setNewItemName('');
      setSelectedFolder(null);
      setIsCreatingFile(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create item",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Contract> }) => {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: "Item updated",
        description: "Successfully updated the item",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update item",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: "Item deleted",
        description: "Successfully deleted the item",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete item",
        description: error.message,
      });
    },
  });

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileCreate = async (parentId: string | null = null) => {
    if (!newItemName) return;
  
    const path = parentId ? `${parentId}/${newItemName}` : newItemName;
    const fileName = newItemName.endsWith('.sol') ? newItemName : `${newItemName}.sol`;
    const contractName = fileName.replace('.sol', '');
  
    const sourceCode = `// SPDX-License-Identifier: MIT
  pragma solidity ^0.8.0;
  
  contract ${contractName} {
      string public message;
  
      constructor() {
          message = "Hello, Blockchain!";
      }
  
      function setMessage(string memory newMessage) public {
          message = newMessage;
      }
  
      function getMessage() public view returns (string memory) {
          return message;
      }
  }`;
  
    try {
      // First check if root folder exists
      const rootResponse = await fetch('/api/contracts?type=folder&name=Contracts');
      let rootFolder = await rootResponse.json();
  
      let effectiveParentId = parentId;
  
      // If no root folder exists or no parent specified, create root folder
      if (!rootFolder || (!parentId && rootFolder.length === 0)) {
        const rootFolderResponse = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Contracts',
            type: 'folder',
            path: '',
            parentId: null
          })
        });
        rootFolder = await rootFolderResponse.json();
        effectiveParentId = rootFolder.id.toString();
      }
  
      // Create the contract file
      await createMutation.mutateAsync({
        name: fileName,
        type: 'file',
        path,
        parentId: effectiveParentId ? parseInt(effectiveParentId) : null,
        sourceCode,
      });
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const handleFolderCreate = async (parentId: string | null = null) => {
    if (!newItemName) return;

    const path = parentId ? `${parentId}/${newItemName}` : newItemName;

    await createMutation.mutateAsync({
      name: newItemName,
      type: 'folder',
      path,
      parentId: parentId ? parseInt(parentId) : null,
    });

    setExpandedFolders(prev => new Set([...Array.from(prev), path]));
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    await deleteMutation.mutateAsync(itemToDelete.id);
    setItemToDelete(null);
  };

  const handleRename = async () => {
    if (!itemToRename || !newItemName) return;
    await updateMutation.mutateAsync({
      id: itemToRename.id,
      data: { name: newItemName },
    });
    setItemToRename(null);
    setNewItemName('');
  };

  const buildFileTree = (items: Contract[], parentId: number | null = null): Contract[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildFileTree(items, item.id),
      }));
  };

  const renderItem = (item: Contract, level: number = 0) => {
    const isExpanded = expandedFolders.has(item.id.toString());

    return (
      <div key={item.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`flex items-center px-2 py-1 hover:bg-accent cursor-pointer text-sm group rounded-sm`}
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={() => {
                if (item.type === 'folder') {
                  toggleFolder(item.id.toString());
                } else if (item.sourceCode) {
                  onFileSelect(item.sourceCode, item.id);
                  toast({
                    title: "File loaded",
                    description: `Loaded ${item.name} into editor`,
                  });
                }
              }}
            >
              {item.type === 'folder' ? (
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${!isExpanded ? '-rotate-90' : ''}`} />
              ) : (
                <div className="w-4" />
              )}
              {item.type === 'folder' ? (
                <Folder className="h-4 w-4 ml-1 mr-2 text-yellow-500 shrink-0" />
              ) : (
                <FileCode className="h-4 w-4 ml-1 mr-2 text-blue-500 shrink-0" />
              )}
              <span className="truncate">{item.name}</span>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => {
              setItemToRename(item);
              setNewItemName(item.name);
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setItemToDelete(item)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
            {item.type === 'folder' && (
              <>
                <ContextMenuItem onClick={() => {
                  setSelectedFolder(item.id.toString());
                  setIsCreatingFile(true);
                }}>
                  <FileCode className="h-4 w-4 mr-2" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => {
                  setSelectedFolder(item.id.toString());
                  setIsCreatingFile(false);
                }}>
                  <Folder className="h-4 w-4 mr-2" />
                  New Folder
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
        {item.type === 'folder' && isExpanded && (
          <div>
            {contracts
              .filter(child => child.parentId === item.id)
              .map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-64 border-r h-full bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="w-64 border-r h-full bg-muted/30">
      <div className="p-4 border-b bg-background">
        <Dialog open={selectedFolder !== null} onOpenChange={() => {
          setSelectedFolder(null);
          setNewItemName('');
        }}>
          <Button variant="outline" size="sm" className="w-full" onClick={() => {
            setSelectedFolder('1');
            setIsCreatingFile(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New {isCreatingFile ? 'File' : 'Folder'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder={isCreatingFile ? "MyContract.sol" : "New Folder"}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                 onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isCreatingFile) {
                      handleFileCreate(selectedFolder);
                    } else {
                      handleFolderCreate(selectedFolder);
                    }
                  }
                }}
              />
              <Button 
                className="w-full"
                onClick={() => {
                  if (isCreatingFile) {
                    handleFileCreate(selectedFolder);
                  } else {
                    handleFolderCreate(selectedFolder);
                  }
                }}
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog 
          open={itemToRename !== null} 
          onOpenChange={(open) => !open && setItemToRename(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename {itemToRename?.type}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />
              <Button className="w-full" onClick={handleRename}>
                Rename
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog 
          open={itemToDelete !== null}
          onOpenChange={(open) => !open && setItemToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {itemToDelete?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. {itemToDelete?.type === 'folder' && 'All files inside the folder will also be deleted.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-2">
          {contracts
            .filter(item => item.parentId === null)
            .map(item => renderItem(item))}
        </div>
      </ScrollArea>
    </div>
  );
}