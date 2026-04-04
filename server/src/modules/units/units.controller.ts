import { Request, Response } from 'express';
import { supabaseService } from '../../config/supabase';

// GET /api/units
export const getUnits = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseService
      .from('units')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching units:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('Error in getUnits:', error);
    res.status(500).json({ success: false, error: 'Lỗi server khi lấy danh sách đơn vị' });
  }
};

// POST /api/units
export const createUnit = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Tên đơn vị là bắt buộc' });
    }

    // Upsert or insert to avoid conflict
    const { data, error } = await supabaseService
      .from('units')
      .insert({ name: name.trim() })
      .select('id, name')
      .single();

    if (error) {
      // Handle unique violation
      if (error.code === '23505') {
        const { data: existingData } = await supabaseService
          .from('units')
          .select('id, name')
          .eq('name', name.trim())
          .single();
        if (existingData) return res.status(200).json({ success: true, data: existingData });
      }
      console.error('Error creating unit:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('Error in createUnit:', error);
    res.status(500).json({ success: false, error: 'Lỗi server khi tạo đơn vị' });
  }
};

// DELETE /api/units/:id
export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID đổi vị là bắt buộc' });
    }

    const { error } = await supabaseService
      .from('units')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return res.status(400).json({ success: false, message: 'Đơn vị tính này đang được nằm trong các Đơn Nhập/Xuất kho nên không thể xóa.', error: error.message });
      }
      console.error('Error deleting unit:', error);
      return res.status(400).json({ success: false, message: 'Lỗi khi xóa đơn vị', error: error.message });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error in deleteUnit:', error);
    res.status(500).json({ success: false, error: 'Lỗi server khi xóa đơn vị' });
  }
};
