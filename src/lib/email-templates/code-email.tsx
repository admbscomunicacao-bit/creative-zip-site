import * as React from "react";

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export const BRAND = {
  // Manual de marca 2026
  ink: "#1B318F",
  blue: "#4A72B6",
  yellow: "#FAB918",
  text: "#20314C",
  muted: "#55617A",
  line: "#E4DDCB",
  mist: "#FBEBBF",
  ivory: "#F6F2E9",
};

interface CodeEmailProps {
  preview: string;
  title: string;
  intro: React.ReactNode;
  code: string;
  note?: React.ReactNode;
}

export const CodeEmail = ({ preview, title, intro, code, note }: CodeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://www.canaltransforma.com.br/brand/logo-sobre-creme.png"
          width="180"
          height="47"
          alt="Canal Transforma"
          style={brand}
        />
        <Text style={eyebrow}>Área editorial</Text>
        <Heading style={h1}>{title}</Heading>
        <Text style={text}>{intro}</Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{code}</Text>
          <Text style={codeHint}>Digite este código na tela de verificação do portal.</Text>
        </Section>
        {note ? <Text style={text}>{note}</Text> : null}
        <Text style={footer}>
          O código expira em cerca de 1 hora e só pode ser usado uma vez. Se você não solicitou este
          e-mail, ignore esta mensagem.
        </Text>
        <Text style={footer}>Canal Transforma, Catanduva (SP)</Text>
      </Container>
    </Body>
  </Html>
);

export default CodeEmail;

const main = {
  backgroundColor: BRAND.ivory,
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};
const container = {
  padding: "28px 26px",
  maxWidth: "560px",
  backgroundColor: "#FFFDF8",
  borderTop: `6px solid ${BRAND.blue}`,
};
const brand = { display: "block", margin: "0 0 6px" };
const eyebrow = {
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  color: BRAND.muted,
  margin: "4px 0 22px",
};
const h1 = {
  fontSize: "23px",
  fontWeight: "bold" as const,
  fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
  color: BRAND.ink,
  margin: "0 0 16px",
};
const text = {
  fontSize: "14px",
  color: BRAND.muted,
  lineHeight: "1.55",
  margin: "0 0 22px",
};
const codeBox = {
  backgroundColor: BRAND.mist,
  borderRadius: "12px",
  padding: "22px 18px",
  textAlign: "center" as const,
};
const codeStyle = {
  fontSize: "34px",
  letterSpacing: "10px",
  fontWeight: "bold" as const,
  color: BRAND.text,
  margin: "0",
};
const codeHint = {
  fontSize: "12px",
  color: BRAND.muted,
  margin: "10px 0 0",
};
const footer = {
  fontSize: "12px",
  color: BRAND.muted,
  lineHeight: "1.5",
  margin: "24px 0 0",
};
