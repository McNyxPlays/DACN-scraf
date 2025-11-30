// src/hooks/useNotificationSocket.js
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSocket } from '../context/SocketContext';
import { useSession } from '../context/SessionContext';
import { addNewNotification, updateNotificationCount } from '../redux/notificationSlice';
import { fetchNotificationCount } from '../redux/notificationSlice'; 

export const useNotificationSocket = () => {
  const socket = useSocket();
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const { sessionKey } = useSession();
  const count = useSelector(state => state.notifications.count);

  useEffect(() => {
    if (!user?.user_id && !sessionKey) return;

    if (count === 0) {
      dispatch(fetchNotificationCount({ userId: user?.user_id, sessionKey }));
    }

    if (!socket) return;

    const room = user?.user_id ? `user_${user.user_id}` : `guest_${sessionKey}`;

    socket.emit('join-notification-room', { room });

    socket.on('notification:new', (noti) => {
      if (window.location.pathname === '/notifications') return;
      dispatch(addNewNotification(noti));
      if (noti.newCount !== undefined) {
        dispatch(updateNotificationCount(noti.newCount));
      }
    });

    socket.on('notification:count', ({ count }) => {
      dispatch(updateNotificationCount(count));
    });

    return () => {
      socket.emit('leave-notification-room', { room });
      socket.off('notification:new');
      socket.off('notification:count');
    };
  }, [socket, user?.user_id, sessionKey, dispatch, count]);
};