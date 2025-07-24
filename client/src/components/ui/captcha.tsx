interface Props {
  question: string;
}

export default function Captcha({ question }: Props) {
  return (
    <div className="bg-muted/70 border border-border px-3 py-2 rounded-md text-foreground flex items-center justify-center min-w-[120px] font-mono">
      {question}
    </div>
  );
}
