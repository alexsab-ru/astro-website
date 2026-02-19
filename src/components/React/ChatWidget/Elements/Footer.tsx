import { User } from "lucide-react";

interface IFooterProps {
  dealer?: string;
}

export function Footer({ dealer = ''}: IFooterProps){
    return (
      <div className="px-4 py-2.5 bg-white border-t border-gray-100 shrink-0 text-center text-gray-300 text-xs">
        {dealer}
      </div>
    );
}