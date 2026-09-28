import { apiClient } from './apiClient';

export interface CitizenRatingItem {
  id: string;
  requestId?: string;
  requestNumber?: string;
  customerName: string;
  customerPhone?: string;
  rating: number;
  comment?: string;
  isApproved: boolean;
  isPublic: boolean;
  isDeleted: boolean;
  adminNote?: string;
  createdAt: string;
}

export const ratingService = {
  getAdminRatings: async (params?: {
    search?: string;
    rating?: string | number;
    status?: string;
  }): Promise<CitizenRatingItem[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.rating) query.append('rating', String(params.rating));
    if (params?.status) query.append('status', params.status);

    return apiClient.get<CitizenRatingItem[]>(`/ratings/admin?${query.toString()}`);
  },

  moderateRating: async (
    id: string,
    data: { isApproved?: boolean; isPublic?: boolean; isDeleted?: boolean; adminNote?: string }
  ): Promise<CitizenRatingItem> => {
    return apiClient.patch<CitizenRatingItem>(`/ratings/admin/${id}`, data);
  }
};
