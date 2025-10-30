import React from "react";

export default function PdfViewer({ url, onClose, title = 'Preview' }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-60" onClick={onClose} />
      <div className="relative bg-white rounded shadow-lg w-[90%] h-[90%] z-10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">{title}</div>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1 bg-[#2B4269] text-white rounded">Open in new tab</a>
            <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
          </div>
        </div>
        <div className="flex-1 w-full">
          <iframe src={url} title="PDF preview" className="w-full h-full border" />
        </div>
      </div>
    </div>
  );
}
