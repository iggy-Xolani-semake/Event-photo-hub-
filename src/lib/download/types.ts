export interface DownloadManifestFile {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface DownloadManifestPart {
  part: number;
  totalParts: number;
  estimatedBytes: number;
  files: DownloadManifestFile[];
}
