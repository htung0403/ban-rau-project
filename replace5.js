const fs = require('fs');

function replaceFile(path1, oldColsDesktop, newColsDesktop, isStandard) {
  let content1 = fs.readFileSync(path1, 'utf8');

  content1 = content1.replace(new RegExp(oldColsDesktop.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g'), newColsDesktop);

  const oldImgCell = `{watch(\`items.\${index}.image_urls\`)?.length > 0 ? (
                                  <label className="relative w-8 h-8 rounded-md border border-border overflow-hidden group/imgDesk cursor-pointer block">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => handleItemImageUpload(index, e)}
                                    />
                                    <img src={watch(\`items.\${index}.image_urls\`)[0]} alt="item" className="w-full h-full object-cover" />
                                    {watch(\`items.\${index}.image_urls\`).length > 1 && (
                                      <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] font-bold px-0.5 rounded-tl-sm">
                                        +{watch(\`items.\${index}.image_urls\`).length - 1}
                                      </div>
                                    )}
                                    {uploadingItemIndex === index && (
                                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <Loader2 size={12} className="animate-spin text-white" />
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setValue(\`items.\${index}.image_urls\`, [], { shouldValidate: true });
                                        setValue(\`items.\${index}.image_url\`, null, { shouldValidate: true });
                                      }}
                                      className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl-sm opacity-0 group-hover/imgDesk:opacity-100 transition-opacity"
                                      title="Xoá ảnh"
                                    >
                                      <X size={8} />
                                    </button>
                                  </label>
                                ) : (
                                  <label className="w-8 h-8 border border-border bg-muted/50 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer transition-all" title="Tải ảnh">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => handleItemImageUpload(index, e)}
                                    />
                                    {uploadingItemIndex === index ? <Loader2 size={12} className="animate-spin text-primary" /> : <ImagePlus size={12} />}
                                  </label>
                                )}`;

  const newImgCell = `<div className="flex items-center gap-1 flex-wrap w-[110px]">
                                  {(watch(\`items.\${index}.image_urls\`) || []).map((url: string, imgIdx: number) => (
                                    <div key={imgIdx} className="relative w-8 h-8 rounded-md border border-border overflow-hidden group/imgDesk shrink-0">
                                      <img src={url} alt="item" className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const newUrls = watch(\`items.\${index}.image_urls\`).filter((_: any, i: number) => i !== imgIdx);
                                          setValue(\`items.\${index}.image_urls\`, newUrls, { shouldValidate: true });
                                          setValue(\`items.\${index}.image_url\`, newUrls.length > 0 ? newUrls[0] : null, { shouldValidate: true });
                                        }}
                                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/imgDesk:opacity-100 transition-opacity"
                                        title="Xoá ảnh"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}
                                  <label className="w-8 h-8 border border-dashed border-border bg-muted/50 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer transition-all shrink-0" title="Thêm ảnh">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => handleItemImageUpload(index, e)}
                                    />
                                    {uploadingItemIndex === index ? <Loader2 size={12} className="animate-spin text-primary" /> : <Plus size={12} />}
                                  </label>
                                </div>`;

  const oldMobileImgCell = `{watch(\`items.\${index}.image_urls\`)?.length > 0 ? (
                                      <label className="relative w-10 h-10 rounded-lg border border-border overflow-hidden group/img cursor-pointer block">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          className="hidden"
                                          onChange={(e) => handleItemImageUpload(index, e)}
                                        />
                                        <img src={watch(\`items.\${index}.image_urls\`)[0]} alt="item" className="w-full h-full object-cover" />
                                        {watch(\`items.\${index}.image_urls\`).length > 1 && (
                                          <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] font-bold px-0.5 rounded-tl-sm">
                                            +{watch(\`items.\${index}.image_urls\`).length - 1}
                                          </div>
                                        )}
                                        {uploadingItemIndex === index && (
                                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <Loader2 size={14} className="animate-spin text-white" />
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setValue(\`items.\${index}.image_urls\`, [], { shouldValidate: true });
                                            setValue(\`items.\${index}.image_url\`, null, { shouldValidate: true });
                                          }}
                                          className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl-sm opacity-0 group-hover/img:opacity-100 transition-opacity"
                                          title="Xoá ảnh"
                                        >
                                          <X size={10} />
                                        </button>
                                      </label>
                                    ) : (
                                      <label className="border border-border bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer transition-all w-10 h-10 shrink-0">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          className="hidden"
                                          onChange={(e) => handleItemImageUpload(index, e)}
                                        />
                                        {uploadingItemIndex === index ? <Loader2 size={14} className="animate-spin text-primary" /> : <ImagePlus size={14} />}
                                      </label>
                                    )}`;

  const newMobileImgCell = `<div className="flex flex-col gap-1 w-10 shrink-0">
                                      {(watch(\`items.\${index}.image_urls\`) || []).map((url: string, imgIdx: number) => (
                                        <div key={imgIdx} className="relative w-10 h-10 rounded-lg border border-border overflow-hidden group/img shrink-0">
                                          <img src={url} alt="item" className="w-full h-full object-cover" />
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const newUrls = watch(\`items.\${index}.image_urls\`).filter((_: any, i: number) => i !== imgIdx);
                                              setValue(\`items.\${index}.image_urls\`, newUrls, { shouldValidate: true });
                                              setValue(\`items.\${index}.image_url\`, newUrls.length > 0 ? newUrls[0] : null, { shouldValidate: true });
                                            }}
                                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            title="Xoá ảnh"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                      <label className="border border-dashed border-border bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer transition-all w-10 h-10 shrink-0" title="Thêm ảnh">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          className="hidden"
                                          onChange={(e) => handleItemImageUpload(index, e)}
                                        />
                                        {uploadingItemIndex === index ? <Loader2 size={14} className="animate-spin text-primary" /> : <Plus size={14} />}
                                      </label>
                                    </div>`;

  content1 = content1.replace(oldImgCell, newImgCell);
  content1 = content1.replace(oldMobileImgCell, newMobileImgCell);
  
  if (isStandard) {
    content1 = content1.replace(
      '<div className="md:hidden shrink-0 mt-auto flex justify-center w-[40px]">',
      '<div className="md:hidden shrink-0 mt-auto flex flex-col items-center w-[40px]">'
    );
    content1 = content1.replace(
      '<div className="hidden md:flex items-center justify-center w-full">',
      '<div className="hidden md:flex items-start justify-start w-full">'
    );
    content1 = content1.replace(
      '<div className="flex justify-center w-[32px]">',
      '<div className="flex justify-start w-full">'
    );
  } else {
    content1 = content1.replace(
      '<div className="hidden md:flex items-center justify-center w-full">',
      '<div className="hidden md:flex items-start justify-start w-full">'
    );
    content1 = content1.replace(
      '<div className="flex justify-center w-[32px]">',
      '<div className="flex justify-start w-full">'
    );
    content1 = content1.replace(
      '<div className="md:hidden shrink-0 mt-auto flex justify-center w-[40px]">',
      '<div className="md:hidden shrink-0 mt-auto flex flex-col items-center w-[40px]">'
    );
  }
  
  fs.writeFileSync(path1, content1, 'utf8');
}

replaceFile(
  'D:\\job-banrau\\client\\src\\pages\\import-orders\\dialogs\\AddEditStandardImportOrderDialog.tsx',
  'grid-cols-[1fr_60px_90px_100px_60px_36px]',
  'grid-cols-[1fr_60px_90px_100px_120px_36px]',
  true
);

replaceFile(
  'D:\\job-banrau\\client\\src\\pages\\import-orders\\dialogs\\AddEditVegetableImportOrderDialog.tsx',
  'grid-cols-[1fr_80px_80px_36px]',
  'grid-cols-[1fr_80px_120px_36px]',
  false
);

console.log('Replaced img cells');
