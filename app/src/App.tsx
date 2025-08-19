import React from 'react';
import {  Routes, Route } from 'react-router-dom';
import First from './First';
import PdfViewerPage from './Jain';
const App = () => {
  return (
    // <Router>
      <Routes>
          <Route path="/" element={<First/>} />
        <Route path="/main" element={<PdfViewerPage/>}>
        </Route>
      </Routes>
    // </Router>
  );
};

export default App;