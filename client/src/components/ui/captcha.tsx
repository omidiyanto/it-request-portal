interface Props {
  question: string;
}

export default function Captcha({ question }: Props) {
  return (
    <div className="captcha-box">
      {question}
    </div>
  );
}
