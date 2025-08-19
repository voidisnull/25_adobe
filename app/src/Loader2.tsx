import React from "react";

const CircleLoader: React.FC = () => {
  return (
    <div className="inline-block">
      <span
        className="block h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
        aria-label="Loading"
        role="status"
      />
    </div>
  );
};

export default CircleLoader;



// const Loader = () => {
//   const barStyle = {
//     display: 'inline-block',
//     width: '3px',
//     height: '20px',
//     backgroundColor: 'rgba(59, 130, 246, 0.3)',
//     borderRadius: '10px',
//     animation: 'scale-up4 1s linear infinite'
//   };

//   const bar2Style = {
//     ...barStyle,
//     height: '35px',
//     margin: '0 5px',
//     animationDelay: '0.25s'
//   };

//   const bar3Style = {
//     ...barStyle,
//     animationDelay: '0.5s'
//   };

//   return (
//     <>
//       <style>
//         {`
//           @keyframes scale-up4 {
//             20% {
//               background-color: #3b82f6;
//               transform: scaleY(1.5);
//             }
//             40% {
//               transform: scaleY(1);
//             }
//           }
//         `}
//       </style>
//       <div className="flex items-center">
//         <span style={barStyle} />
//         <span style={bar2Style} />
//         <span style={bar3Style} />
//       </div>
//     </>
//   );
// };

// export default Loader;