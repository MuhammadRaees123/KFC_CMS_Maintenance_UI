import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface KFCCardProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode; // optional buttons or links in header
  className?: string;
}

export const KFCCard: React.FC<KFCCardProps> = ({
  title,
  children,
  actions,
  className = "",
}) => {
  return (
    <Card
      className={`border-l-4 border-[#bc3342] shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-[#bc3342]">
          {title}
        </CardTitle>
        {actions && <div className="flex space-x-2">{actions}</div>}
      </CardHeader>

      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
};
