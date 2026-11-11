// Configure the text sent to Text Search here. These are not Places type filters.
export const searchCategories = [
    { id: "psychology-clinic", label: "Clínica de Psicologia", searchTerm: "clínica de psicologia" },
    { id: "psychiatric-clinic", label: "Clínica Psiquiátrica", searchTerm: "clínica psiquiátrica" },
    { id: "mental-health-clinic", label: "Clínica de Saúde Mental", searchTerm: "clínica de saúde mental" },
    { id: "psychotherapy-clinic", label: "Clínica de Psicoterapia", searchTerm: "clínica de psicoterapia" },
    { id: "psychology-office", label: "Consultório de Psicologia", searchTerm: "consultório de psicologia" },
    { id: "psychology-center", label: "Centro de Psicologia", searchTerm: "centro de psicologia" },
    { id: "psychology-institute", label: "Instituto de Psicologia", searchTerm: "instituto de psicologia" },
    { id: "therapeutic-support", label: "Acompanhamento Terapêutico", searchTerm: "acompanhamento terapêutico" },
    { id: "therapeutic-center", label: "Centro Terapêutico", searchTerm: "centro terapêutico" },
    { id: "multidisciplinary-clinic", label: "Clínica Multidisciplinar", searchTerm: "clínica multidisciplinar de saúde mental" },
    { id: "neuropsychology-clinic", label: "Clínica de Neuropsicologia", searchTerm: "clínica de neuropsicologia" },
    { id: "child-psychology", label: "Psicologia Infantil", searchTerm: "clínica de psicologia infantil" },
    { id: "aba-therapy-clinic", label: "Clínica de Terapia ABA", searchTerm: "clínica de terapia ABA" },
    { id: "psychosocial-rehabilitation", label: "Centro de Reabilitação Psicossocial", searchTerm: "centro de reabilitação psicossocial" },
    { id: "caps", label: "Centro de Atenção Psicossocial (CAPS)", searchTerm: "Centro de Atenção Psicossocial CAPS" },
    { id: "occupational-therapy", label: "Clínica de Terapia Ocupacional", searchTerm: "clínica de terapia ocupacional" },
    { id: "psychopedagogy-clinic", label: "Clínica de Psicopedagogia", searchTerm: "clínica de psicopedagogia" }
];
export function getPublicCategories() {
    return searchCategories.map(({ id, label }) => ({ id, label }));
}
//# sourceMappingURL=categories.js.map