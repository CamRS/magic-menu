import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Download, Upload, ImageIcon } from "lucide-react";
import { type MenuItem, type InsertMenuItem } from "@shared/schema";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  return (
    <div className="container mx-auto p-4">
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>CSV Import Instructions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To successfully import menu items, please follow these steps:
            </p>
            <div className="bg-amber-100 p-4 rounded-md border border-amber-200">
              <h3 className="font-medium mb-2">Important: Use the Export Template</h3>
              <p className="text-sm">
                For best results, first click "Export CSV" to download a template with the correct format.
                Then add your new items to this file.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {}}>
              Continue Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageUploadDialogOpen} onOpenChange={setIsImageUploadDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload Menu Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To upload a full menu image, please follow these guidelines:
            </p>
            <div className="bg-amber-100 p-4 rounded-md border border-amber-200">
              <h3 className="font-medium mb-2">Image Requirements</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>High-resolution images of your complete menu</li>
                <li>Supported formats: JPG, PNG, GIF</li>
                <li>Maximum file size: 5MB</li>
                <li>Ensure the menu text is clear and readable</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImageUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {}}>
              Choose Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}