const FilesPageLoading = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-xl bg-[#ede7e4] dark:bg-[#4d453e]" />
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-52 rounded-xl bg-[#ede7e4] dark:bg-[#4d453e]"
          />
        ))}
      </section>
    </div>
  );
};

export default FilesPageLoading;
