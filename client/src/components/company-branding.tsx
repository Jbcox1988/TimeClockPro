import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";

export function CompanyBranding() {
  const { data } = useQuery({
    queryKey: ["/api/settings"],
  });

  const settings = data?.settings;

  return (
    <div className="text-center mb-8">
      {/* Show logo section only if enabled */}
      {settings?.showLogo && (
        <div className="mx-auto mb-2 flex items-center justify-center">
          {settings?.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Company Logo" 
              className="max-w-xs h-16 object-contain"
            />
          ) : (
            <Clock className="text-primary dark:text-primary w-20 h-20" />
          )}
        </div>
      )}
      
      {/* Show company name only if enabled */}
      {settings?.showCompanyName && (
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {settings?.companyName || "TimeClock Pro"}
        </h1>
      )}
      
      <p className="text-gray-600 dark:text-gray-400">TimeClockPro</p>
    </div>
  );
}
