import React, { useState } from 'react';
import Dashboard from './Dashboard';
import PlaceManager from './PlaceManager';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div>
      <header className="govuk-header">
        <div className="govuk-header__container">
          <h1>Commute Planner</h1>
        </div>
      </header>

      <div className="govuk-width-container">
        <nav className="govuk-tabs">
          <ul className="govuk-tabs__list">
            <li className="govuk-tabs__list-item">
              <button
                className={`govuk-tabs__tab ${activeTab === 'dashboard' ? 'govuk-tabs__tab--selected' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
            </li>
            <li className="govuk-tabs__list-item">
              <button
                className={`govuk-tabs__tab ${activeTab === 'places' ? 'govuk-tabs__tab--selected' : ''}`}
                onClick={() => setActiveTab('places')}
              >
                Configuration
              </button>
            </li>
          </ul>
        </nav>

        <main className="govuk-main-wrapper">
          {activeTab === 'dashboard' ? <Dashboard /> : <PlaceManager />}
        </main>
      </div>
    </div>
  );
}

export default App;
