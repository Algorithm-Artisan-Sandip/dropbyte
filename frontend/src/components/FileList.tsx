import type { FileItem } from "../types";
import { FileCard } from "./FileCard";

export function FileList({ files, onChanged }: { files: FileItem[]; onChanged: () => void }) {
  if (!files.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No files yet</p>;
  }
  return (
    <div className="rounded-md border px-3">
      {files.map((file) => (
        <FileCard key={file.id} file={file} onChanged={onChanged} />
      ))}
    </div>
  );
}
