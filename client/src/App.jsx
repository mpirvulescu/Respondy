import { useState, useEffect } from 'react';

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');

  const fetchItems = async () => {
    // const res = await fetch('/api/items');
    // const data = await res.json();
    setItems([{id:0,name:"test"}]);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // await fetch('/api/items', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ name }),
    // });

    setName('');
    fetchItems();
  };

  const deleteItem = async (id) => {
    // await fetch(`/api/items/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  return (
    <div className="container">
      <h1>Fullstack App</h1>

      <form onSubmit={addItem}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter item name"
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <button onClick={() => deleteItem(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
