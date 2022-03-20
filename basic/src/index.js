import React from './react';
import ReactDOM from './react-dom';

function Counter() {
  const [number, setNumber] = React.useState(0)
  const handleClick = () => {
    // setNumber(new Date().getTime())
    setNumber(3)
  }

  React.useEffect(() => {
    console.log(11)
    return () => {
      console.log(22)
    }
  }, [number])

  return (
      <div>
        <div onClick={handleClick}>{number}</div>
        {number === 3 ? (<div>121</div>) : <Counter1/>}
      </div>
  )
}

function Counter1() {
  const [number, setNumber] = React.useState('test')
  const handleClick = () => {
    setNumber(new Date().getTime())
  }

  React.useEffect(() => {
    return () => {
      console.log(333)
    }
  }, [])

  return <div onClick={handleClick}>{number}</div>
}

ReactDOM.render(<Counter/>, document.getElementById('root'));