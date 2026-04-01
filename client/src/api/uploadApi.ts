import axiosClient from './axiosClient';

export interface UploadResponse {
  url: string;
  path: string;
}

export const uploadApi = {
  uploadFile: async (file: File, bucket = 'avatars', folder = 'user-avatars') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('folder', folder);

    const { data } = await axiosClient.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  },
};
