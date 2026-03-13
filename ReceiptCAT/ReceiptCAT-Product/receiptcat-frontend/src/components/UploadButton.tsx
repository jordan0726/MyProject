// src/layout/UploadButton.tsx

/**
 * UploadButton
 * ------------
 * - Wrapper for file input + AntD Button
 * - Triggers hidden <input type="file"> when clicked
 * - Returns the selected file via onPick callback
 */

import { useRef } from "react";
import { Button } from "antd";

type Props = {
  onPick: (file: File) => void;       /** Callback when a file is selected */
  accept?: string;                    /** Accepted file types (default: image/*) */
  label?: string;                     /** Button label (default: "Upload") */
  type?: "primary" | "default" | "dashed" | "link" | "text"; /** AntD button type */
};

export default function UploadButton({
  onPick,
  accept = "image/*",
  label = "Upload",
  type = "primary",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  /** Open hidden file picker */
  const openPicker = () => inputRef.current?.click();

  /** Handle file selection */
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
    e.currentTarget.value = ""; // allow re-pick of the same file
  };

  return (
    <>
      <Button type={type} onClick={openPicker} data-testid="upload-button">{label}</Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={false}
        style={{ display: "none" }}
        onChange={onChange}
        data-testid="file-input" // Add test ID for file input, just for testing
      />
    </>
  );
}
