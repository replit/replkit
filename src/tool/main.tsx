import * as React from 'react';
import { createRoot } from 'react-dom/client';

function Component() {
  return (
    <div>
      hi there
    </div>
  )
}

createRoot(document.getElementById('root') as Element).render(
  <Component />
)