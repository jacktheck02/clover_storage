const DashboardLoading = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-56 rounded-xl bg-[#ede7e4] dark:bg-[#4d453e]" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-40 rounded-xl bg-[#ede7e4] dark:bg-[#4d453e]"
          />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-[#ede7e4] dark:bg-[#4d453e]" />
    </div>
  );
};

export default DashboardLoading;
