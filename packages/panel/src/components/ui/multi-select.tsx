import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface MultiSelectProps {
	options: { id: number; name: string }[];
	value: number[];
	onChange: (value: number[]) => void;
	placeholder?: string;
	className?: string;
}

export function MultiSelect({
	options,
	value,
	onChange,
	placeholder = "Auswählen...",
	className,
}: MultiSelectProps) {
	const [open, setOpen] = React.useState(false);

	const selectedOptions = options.filter((opt) => value.includes(opt.id));
	const isAllSelected = value.length === 0 || value.length === options.length;

	const toggleOption = (id: number) => {
		const newValue = value.includes(id)
			? value.filter((v) => v !== id)
			: [...value, id];
		onChange(newValue);
	};

	const removeOption = (id: number, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onChange(value.filter((v) => v !== id));
	};

	const displayText = isAllSelected
		? "Alle Makler"
		: `${selectedOptions.length} ausgewählt`;

	return (
		<PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
			<PopoverPrimitive.Trigger asChild>
				<button
					className={cn(
						"border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-auto min-h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
						className,
					)}
				>
					<div className="flex flex-1 flex-wrap gap-1">
						{isAllSelected ? (
							<span className="text-muted-foreground">{displayText}</span>
						) : (
							<>
								{selectedOptions.slice(0, 2).map((opt) => (
									<Badge
										key={opt.id}
										variant="secondary"
										className="gap-1 pl-2 pr-1"
									>
										{opt.name}
										<button
											onClick={(e) => removeOption(opt.id, e)}
											className="hover:bg-muted-foreground/20 rounded-sm p-0.5"
										>
											<X className="h-3 w-3" />
										</button>
									</Badge>
								))}
								{selectedOptions.length > 2 && (
									<Badge variant="secondary">
										+{selectedOptions.length - 2}
									</Badge>
								)}
							</>
						)}
					</div>
					<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</button>
			</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-3 shadow-md outline-none"
					align="start"
					sideOffset={4}
				>
					<div className="space-y-2 max-h-64 overflow-y-auto">
						{options.map((option) => {
							const isSelected = value.includes(option.id);
							return (
								<div
									key={option.id}
									className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer"
									onClick={() => toggleOption(option.id)}
								>
									<Checkbox checked={isSelected} />
									<span className="text-sm select-none">{option.name}</span>
								</div>
							);
						})}
					</div>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
