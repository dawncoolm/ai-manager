import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";

interface MarkdownViewerProps {
  content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="prose prose-sm max-w-none break-words prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-indigo-600 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-gray-800 prose-pre:overflow-x-auto prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-table:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkFrontmatter]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
