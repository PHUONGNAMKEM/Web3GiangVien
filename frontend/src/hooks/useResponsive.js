import { useMediaQuery } from '@mui/material';

export const useIsMobile = () => useMediaQuery('(max-width:768px)');
export const useIsTablet = () => useMediaQuery('(max-width:1024px)');
export const useResponsiveModalWidth = (desktopWidth = 600) => {
    const isMobile = useIsMobile();
    return isMobile ? '95vw' : desktopWidth;
};
