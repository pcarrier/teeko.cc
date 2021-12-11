import { FunctionComponent } from "preact";

export const OnlineGame: FunctionComponent<{
  room: string;
}> = ({ room }: { room: string }) => {
  return <p>Online is not supported yet.</p>;
};
