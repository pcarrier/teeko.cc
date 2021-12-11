import { FunctionComponent } from "preact";

export const OnlineGame: FunctionComponent<{
  room: string;
}> = ({ room }: { room: string }) => {
  return (
    <>
      <h1>{room}</h1>
      <p>Online is not supported yet.</p>
    </>
  );
};
