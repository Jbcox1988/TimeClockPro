export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error("No data to export");
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.map(header => `"${header}"`).join(","),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle dates, nulls, and strings with commas
        if (value === null || value === undefined) {
          return '""';
        }
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(",")
    )
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function formatPunchesForCSV(punches: any[]) {
  return punches.map(punch => ({
    "Employee ID": punch.employeeId,
    "Punch Type": punch.punchType,
    "Date": new Date(punch.timestamp).toLocaleDateString(),
    "Time": new Date(punch.timestamp).toLocaleTimeString(),
    "Timestamp": punch.timestamp,
    "Latitude": punch.latitude || "N/A",
    "Longitude": punch.longitude || "N/A",
    "IP Address": punch.ipAddress,
    "Flagged": punch.flagged ? "Yes" : "No"
  }));
}

export function formatEmployeesForCSV(employees: any[]) {
  return employees.map(employee => ({
    "Employee ID": employee.id,
    "Name": employee.name,
    "PIN": "****", // Don't export actual PINs for security
    "Status": employee.isActive ? "Active" : "Inactive"
  }));
}
