export interface StatCardProps {
  count: string;
  label: string;
  icon: string;
  bgColor: string;
}

export interface InspectionCardProps {
  imageUrl: string;
  address: string;
  date: string;
  status?: "pending" | "processing" | "upcoming" | "completed";
  imagesCount?: number;
}

export interface ActionButtonProps {
  icon: string;
  label: string;
  bgColor: string;
  onClick?: () => void;
}

export interface NavItem {
  label: string;
  href: string;
  isActive?: boolean;
}

export interface Stat {
  count: string;
  label: string;
  icon: string;
  bgColor: string;
}

export interface Inspection {
  imageUrl: string;
  address: string;
  date: string;
  imagesCount?: number;
  status?: "pending" | "processing" | "upcoming" | "completed";
}

export interface QuickAction {
  icon: string;
  label: string;
  bgColor: string;
  onClick?: () => void;
}
