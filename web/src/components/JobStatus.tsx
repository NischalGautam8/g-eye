import React from 'react';

interface JobStatusProps {
  status: string | null;
}

function JobStatus({ status }: JobStatusProps): JSX.Element | null {
  if (!status) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-2 text-center">
      <p>Job Status: <span className="font-bold">{status}</span></p>
    </div>
  );
}

export default JobStatus;
