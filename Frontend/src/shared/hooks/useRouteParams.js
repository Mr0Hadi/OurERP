import { useParams } from 'react-router-dom';

export const useRouteParams = () => {
  const params = useParams();
  
  const getId = () => {
    return params.id ? parseInt(params.id) : null;
  };
  
  return {
    ...params,
    id: getId(),
  };
};