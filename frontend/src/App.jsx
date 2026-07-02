import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0); 

  return (
    <div className="app-container">
      <h1>Hello, World!</h1>
      <p>You clicked the button {count} times.</p>
      <button onClick={() => setCount(count + 1)}>
        test
      </button>
    </div>
  );
}

export default App;
