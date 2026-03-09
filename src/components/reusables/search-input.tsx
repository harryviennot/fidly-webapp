"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[180px] flex items-center gap-2 px-3 py-2 rounded-lg border border-[#DEDBD5] bg-[#FAFAF8]",
        className
      )}
    >
      <MagnifyingGlass className="w-3.5 h-3.5 text-[#B0B0B0] shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-none bg-transparent outline-none text-[12.5px] text-[#333] w-full font-[inherit] placeholder:text-[#B0B0B0]"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="text-[#BBB] hover:text-[#666] transition-colors text-sm"
        >
          ×
        </button>
      )}
    </div>
  );
}
