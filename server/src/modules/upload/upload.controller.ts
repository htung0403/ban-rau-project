import { Request, Response } from 'express';
import { supabaseService } from '../../config/supabase';
import { successResponse, errorResponse } from '../../utils/response';
import { v4 as uuidv4 } from 'uuid';

export class UploadController {
  static async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json(errorResponse('Không tìm thấy file tải lên'));
      }

      const file = req.file;
      const fileExt = file.originalname.split('.').pop() || 'tmp';
      const fileName = `${uuidv4()}-${Date.now()}.${fileExt}`;
      
      const bucketName = req.body.bucket || 'import-orders';
      const folderPath = req.body.folder || '';
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

      const { data, error } = await supabaseService.storage
        .from(bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json(errorResponse('Lỗi khi tải ảnh lên storage: ' + error.message));
      }

      const { data: publicUrlData } = supabaseService.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return res.status(200).json(successResponse({
        url: publicUrlData.publicUrl,
        path: filePath
      }, 'Upload thành công'));
    } catch (err: any) {
      console.error('Upload catch error:', err);
      return res.status(500).json(errorResponse(err.message || 'Lỗi server khi upload ảnh'));
    }
  }
}
