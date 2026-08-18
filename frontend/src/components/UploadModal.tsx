import { useState } from "react";
import { useUpload } from "../hooks/useUpload";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";

export function UploadModal({ onChanged }: { onChanged: () => void }) {
  const { run, busy, error, cancel } = useUpload(onChanged);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Upload</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
        </DialogHeader>
        <p className="mb-3 text-sm text-muted-foreground">
          Chunks are 8 MB. Same file is resumed from the last completed chunk.
        </p>
        <Input
          type="file"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void run(file);
          }}
        />
        {busy ? (
          <Button className="mt-3" variant="outline" onClick={cancel}>
            Interrupt (resume later)
          </Button>
        ) : null}
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
