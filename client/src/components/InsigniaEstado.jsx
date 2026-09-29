const ESTADOS = {
  critico: {
    texto: 'Crítico',
    icono: (
      <path d="M12 3 2 21h20L12 3Zm0 6v5m0 3v.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  moderado: {
    texto: 'Moderado',
    icono: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2" strokeLinecap="round" />,
  },
  estable: {
    texto: 'Estable',
    icono: (
      <path
        d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
};

/** Estado con color + icono + texto: nunca se comunica solo con color. */
export default function InsigniaEstado({ estado }) {
  const e = ESTADOS[estado];
  return (
    <span className={`insignia insignia-${estado}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden="true"
      >
        {e.icono}
      </svg>
      {e.texto}
    </span>
  );
}
