import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRouting from './AppRoutes';

import './App.css'

function App() {
  return (
    <>
      <AppRouting />
      <ToastContainer
        position="bottom-right"
        autoClose={2800}
        hideProgressBar={false}
        newestOnTop
        closeButton={false}
        pauseOnFocusLoss={false}
        pauseOnHover
        draggable={false}
        theme="dark"
      />
    </>
  )
}

export default App
