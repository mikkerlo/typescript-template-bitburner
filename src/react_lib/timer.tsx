import React from 'lib/react';

interface TimerProps {
  initialTime: number;
}

const Timer: React.FC<TimerProps> = ({ initialTime }) => {
  const [timeRemaining, setTimeRemaining] = React.useState<number>(initialTime);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (timeRemaining > 0) {
      timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 10);
      }, 10);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [timeRemaining]);

  const minutes: number = Math.floor(timeRemaining / (1000 * 60));
  const seconds: number = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  const milliseconds: number = timeRemaining % 1000;

  const minutesString: string = minutes.toString().padStart(2, '0');
  const secondsString: string = seconds.toString().padStart(2, '0');
  const millisecondsString: string = milliseconds.toString().padStart(3, '0').substring(0, 3);

  return (
      <h2>{`${minutesString}:${secondsString}.${millisecondsString}`}</h2>
  );
};

export default Timer;
