const fs = require('fs');

function replaceMobileCell(path1) {
  let content = fs.readFileSync(path1, 'utf8');

  // We find the block starting with "{watch(`items.${index}.image_urls`)?.length > 0 ? ("
  // under "{/* Mobile Single Image */}"
  // and ending with "</div>" right before "{/* Mobile Delete Button */}"
  
  const startMarker = '{/* Mobile Single Image */}';
  const endMarker = '{/* Mobile Delete Button */}';
  
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found in ' + path1);
    return;
  }
  
  const beforeBlock = content.substring(0, startIndex + startMarker.length);
  const afterBlock = content.substring(endIndex);
  
  const newMobileCell = `
                                  <div className="md:hidden mt-2 col-span-full border-t border-border pt-2 pb-1">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5 block">Ảnh hàng hóa</label>
                                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar w-full">
                                      {(watch(\`items.\${index}.image_urls\`) || []).map((url: string, imgIdx: number) => (
                                        <div key={imgIdx} className="relative w-12 h-12 rounded-lg border border-border overflow-hidden group/img shrink-0">
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
                                            title="Xóa ảnh"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      ))}
                                      <label className="border border-dashed border-border bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer transition-all w-12 h-12 shrink-0" title="Thêm ảnh">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          className="hidden"
                                          onChange={(e) => handleItemImageUpload(index, e)}
                                        />
                                        {uploadingItemIndex === index ? <Loader2 size={16} className="animate-spin text-primary" /> : <Plus size={16} />}
                                      </label>
                                    </div>
                                  </div>
                                  `;

  content = beforeBlock + newMobileCell + '                                  ' + afterBlock;
  fs.writeFileSync(path1, content, 'utf8');
}

replaceMobileCell('D:\\job-banrau\\client\\src\\pages\\import-orders\\dialogs\\AddEditStandardImportOrderDialog.tsx');
replaceMobileCell('D:\\job-banrau\\client\\src\\pages\\import-orders\\dialogs\\AddEditVegetableImportOrderDialog.tsx');

console.log('Replaced mobile img cells');
