import { NS } from '@ns';
import React from 'lib/react';

const Timer: React.FC = () => {
    // Initialize state to 2 minutes in milliseconds
    const [timeRemaining, setTimeRemaining] = React.useState<number>(2 * 60 * 1000);
  
    React.useEffect(() => {
      // Start the timer only if time is remaining
      let timer: ReturnType<typeof setTimeout>;
      if (timeRemaining > 0) {
        timer = setTimeout(() => {
          setTimeRemaining(timeRemaining - 10); // Update every 10 milliseconds
        }, 10);
      }
  
      // Clear timer when the component unmounts
      return () => {
        clearTimeout(timer);
      };
    }, [timeRemaining]);
  
    // Convert remaining time to the required format (mm:ss)
    const minutes: number = Math.floor(timeRemaining / (1000 * 60));
    const seconds: number = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    const milliseconds: number = timeRemaining % 1000;
  
    // Format time as strings, ensuring two digits for minutes and seconds
    const minutesString: string = minutes.toString().padStart(2, '0');
    const secondsString: string = seconds.toString().padStart(2, '0');
    const millisecondsString: string = milliseconds.toString().padStart(3, '0').substring(0, 3);
  
    return (
      <div>
        <h1>2 Minute Timer</h1>
        <h2>{`${minutesString}:${secondsString}.${millisecondsString}`}</h2>
      </div>
    );
  };

export async function main(ns: NS){
  ns.printRaw(<Timer />);
}
