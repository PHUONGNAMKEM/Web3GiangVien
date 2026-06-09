import React, { useState, useEffect } from 'react';
import { Tag, Tooltip } from 'antd';
import { Clock, AlertTriangle, XCircle, Calendar } from 'lucide-react';
import { getDeadlineStatus, formatDeadline } from '../../utils/deadlineUtils';

const DeadlineBadge = ({ deadline, label = "Hạn chót" }) => {
    const [status, setStatus] = useState('none');
    const [formatted, setFormatted] = useState({ text: '', countdown: '', isExpired: false });
    const [isBlinking, setIsBlinking] = useState(false);

    useEffect(() => {
        if (!deadline) return;

        const updateStatus = () => {
            const currentStatus = getDeadlineStatus(deadline);
            const currentFormatted = formatDeadline(deadline);
            setStatus(currentStatus);
            setFormatted(currentFormatted);
        };

        updateStatus();
        
        // Cập nhật mỗi phút
        const interval = setInterval(updateStatus, 60000);
        return () => clearInterval(interval);
    }, [deadline]);

    useEffect(() => {
        if (status === 'urgent') {
            const blinkInterval = setInterval(() => setIsBlinking(prev => !prev), 1000);
            return () => clearInterval(blinkInterval);
        } else {
            setIsBlinking(false);
        }
    }, [status]);

    if (!deadline) {
        return <Tag color="default"><Calendar size={12} style={{ marginRight: 4 }} />{label}: Không giới hạn</Tag>;
    }

    let color = 'default';
    let icon = <Calendar size={12} style={{ marginRight: 4 }} />;
    let text = `${label}: ${formatted.text}`;

    if (status === 'expired') {
        color = 'red';
        icon = <XCircle size={12} style={{ marginRight: 4 }} />;
        text = `Đã hết hạn (${label})`;
    } else if (status === 'urgent') {
        color = 'error';
        icon = <AlertTriangle size={12} style={{ marginRight: 4 }} />;
        text = `Gấp: ${formatted.countdown}`;
    } else if (status === 'warning') {
        color = 'warning';
        icon = <Clock size={12} style={{ marginRight: 4 }} />;
        text = `Sắp hết hạn: ${formatted.countdown}`;
    } else {
        color = 'success';
        icon = <Calendar size={12} style={{ marginRight: 4 }} />;
        text = `${label}: ${formatted.text}`;
    }

    return (
        <Tooltip title={`${label}: ${formatted.text}`}>
            <Tag color={color} style={{ opacity: isBlinking ? 0.6 : 1, transition: 'opacity 0.5s' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {icon} {text}
                </span>
            </Tag>
        </Tooltip>
    );
};

export default DeadlineBadge;
