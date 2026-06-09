import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrBefore);

/**
 * Lấy deadline hiệu lực (fallback chain)
 * @param {Object} deTai 
 * @param {'dangKy' | 'baoCao' | 'tienDo'} type 
 * @returns {Date | null}
 */
export const getEffectiveDeadline = (deTai, type) => {
    if (!deTai) return null;
    
    switch (type) {
        case 'dangKy':
            return deTai.HanDangKy || deTai.Deadline || null;
        case 'baoCao':
            return deTai.HanNopBaoCao || deTai.Deadline || null;
        case 'tienDo':
            return deTai.HanCapNhatTienDo || deTai.HanNopBaoCao || deTai.Deadline || null;
        default:
            return deTai.Deadline || null;
    }
};

/**
 * Tính trạng thái deadline
 * @param {Date | string} deadline 
 * @returns {'expired' | 'urgent' | 'warning' | 'safe' | 'none'}
 */
export const getDeadlineStatus = (deadline) => {
    if (!deadline) return 'none';
    
    const now = dayjs();
    const target = dayjs(deadline);
    
    if (target.isSameOrBefore(now)) return 'expired';
    
    const diffHours = target.diff(now, 'hour');
    if (diffHours <= 24) return 'urgent';
    
    const diffDays = target.diff(now, 'day');
    if (diffDays <= 3) return 'warning';
    
    return 'safe';
};

/**
 * Format deadline thành text + countdown
 * @param {Date | string} deadline 
 * @returns {{ text: string, countdown: string, isExpired: boolean }}
 */
export const formatDeadline = (deadline) => {
    if (!deadline) return { text: 'Không giới hạn', countdown: '', isExpired: false };
    
    const target = dayjs(deadline);
    const now = dayjs();
    
    const isExpired = target.isSameOrBefore(now);
    const text = target.format('DD/MM/YYYY HH:mm');
    
    let countdown = '';
    if (!isExpired) {
        const diffDays = target.diff(now, 'day');
        const diffHours = target.diff(now, 'hour') % 24;
        
        if (diffDays > 0) {
            countdown = `Còn ${diffDays} ngày ${diffHours > 0 ? `${diffHours} giờ` : ''}`;
        } else {
            const diffMinutes = target.diff(now, 'minute') % 60;
            countdown = `Còn ${diffHours} giờ ${diffMinutes} phút`;
        }
    } else {
        countdown = 'Đã hết hạn';
    }
    
    return { text, countdown, isExpired };
};
