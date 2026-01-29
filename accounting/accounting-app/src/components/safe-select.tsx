import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * A safe wrapper around the Select component that ensures no empty string values are passed to SelectItem
 */
export const SafeSelect = ({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  id,
  label,
  children,
  ...props
}: {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  label?: string;
  children?: React.ReactNode;
} & React.ComponentPropsWithoutRef<typeof Select>) => {
  // Ensure value is never empty string
  const safeValue = value || "none";
  
  // Make sure all options have valid non-empty values
  const safeOptions = options.map((option) => ({
    value: option.value || `option_${Math.random().toString(36).substring(2, 9)}`,
    label: option.label || "Unnamed Option",
  }));
  
  // Add a none option if it doesn't exist
  if (!safeOptions.some((option) => option.value === "none")) {
    safeOptions.unshift({ value: "none", label: "None" });
  }

  return (
    <Select value={safeValue} onValueChange={onValueChange} {...props}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children || 
          safeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        }
      </SelectContent>
    </Select>
  );
};

/**
 * A component that safely renders dynamic SelectItems from CSV data
 */
export const SafeCsvSelect = ({
  headers = [],
  value,
  onValueChange,
  includeNone = true,
  placeholder = "Select column",
  id,
  ...props
}: {
  headers: string[];
  value: string;
  onValueChange: (value: string) => void;
  includeNone?: boolean;
  placeholder?: string;
  id?: string;
} & React.ComponentPropsWithoutRef<typeof Select>) => {
  // Ensure value is never empty string
  const safeValue = value || "none";
  
  // Create safe header options (filter out empty values)
  const safeHeaders = headers
    .filter(header => header && header.trim() !== '')
    .map(header => ({ 
      value: header, 
      label: header 
    }));
  
  return (
    <Select value={safeValue} onValueChange={onValueChange} {...props}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeNone && <SelectItem value="none">None</SelectItem>}
        {safeHeaders.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};