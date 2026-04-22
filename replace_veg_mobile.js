const fs = require('fs');
const path1 = 'D:\\job-banrau\\client\\src\\pages\\import-orders\\dialogs\\AddEditVegetableImportOrderDialog.tsx';
let content = fs.readFileSync(path1, 'utf8');

const startMarker = '{/* Mobile Image Button */}';
const endMarker = '<div className="md:hidden grid gap-2 border-t border-dashed border-border pt-2 mt-2 grid-cols-2">';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const beforeBlock = content.substring(0, startIndex);
  const afterBlock = content.substring(endIndex);

  const newMobileCell = `{/* Mobile Image Grid */}
                                  <div className="md:hidden mt-2 col-span-full border-t border-dashed border-border pt-2 pb-1 w-full">
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
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
                                        {uploadingItemIndex === index ? (
                                          <svg className="animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                        )}
                                      </label>
                                    </div>
                                  </div>
                                  `;

  content = beforeBlock + newMobileCell + '                                ' + afterBlock;
  fs.writeFileSync(path1, content, 'utf8');
  console.log('Replaced in Vegetable dialog');
} else {
  console.log('Markers not found');
}