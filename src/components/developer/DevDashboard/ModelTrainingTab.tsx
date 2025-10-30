import React from 'react';
import { ModelTrainingDashboard } from '../../dev/ModelTrainingDashboard';
import { User } from '../../../App';

interface ModelTrainingTabProps {
  user: User;
}

export const ModelTrainingTab: React.FC<ModelTrainingTabProps> = ({ user }) => {
  return <ModelTrainingDashboard user={user} />;
};

