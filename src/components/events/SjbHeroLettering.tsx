import { forwardRef, type SVGProps } from "react";

export interface SjbHeroLetteringProps extends SVGProps<SVGSVGElement> {
  face: string;
  shadow: string;
}

/** Exact supplied sjb_logo_long.svg paths, in their original drawing order. */
export const SjbHeroLettering = forwardRef<SVGSVGElement, SjbHeroLetteringProps>(
  function SjbHeroLettering({ face, shadow, className, ...props }, ref) {
    return <svg ref={ref} viewBox="0 0 1473.98 147.09" className={className} {...props}>
      <path fill={shadow} fillRule="evenodd" d="M13.1,25L30.1,8h57.5l23.56,23.56v20.5h-33l-6.56-6.56v-5.44h-18.94v17.44h34.94l23.56,23.56v36.5l-17,17h-57.5l-23.56-23.56v-20.5h33l6.56,6.56v5.44h18.94v-17.44h-34.94l-23.56-23.56V25Z" />
      <path fill={face} fillRule="evenodd" d="M46.1,57.5h41.5l17,17v36.5l-17,17H30.1l-17-17v-20.5h33v12h25.5v-24H30.1l-17-17V25L30.1,8h57.5l17,17v20.5h-33v-12h-25.5v24Z" />
      <path fill={shadow} fillRule="evenodd" d="M116.6,102.5h10.73l27.56-94.5h44.25l6.56,6.56,25.65,87.94h6.08l6.56,6.56v25.5h-55.83l-6.56-6.56v-25.5h10.73l-1.59-5.44h-18.98l-1.59,5.44h2.25l6.56,6.56v25.5h-55.83l-6.56-6.56v-25.5ZM185.32,78.5l-4.07-13.97-4.07,13.97h8.15Z" />
      <path fill={face} fillRule="evenodd" d="M116.6,102.5h10.73l27.56-94.5h44.25l27.56,94.5h10.73v25.5h-55.83v-25.5h10.73l-3.5-12h-23.62l-3.5,12h10.73v25.5h-55.83v-25.5ZM185.32,78.5l-8.31-28.5-8.31,28.5h16.62Z" />
      <path fill={shadow} fillRule="evenodd" d="M249.43,8h43.73l6.56,6.56,23.44,46.88v-21.38h-4.16l-6.56-6.56V8h54.45l6.56,6.56v25.5h-10.73v94.5h-33l-6.56-6.56-23.44-46.88v21.38h4.16l6.56,6.56v25.5h-54.45l-6.56-6.56v-25.5h10.73v-62.44h-4.16l-6.56-6.56V8Z" />
      <path fill={face} fillRule="evenodd" d="M249.43,8h43.73l30,60v-34.5h-10.73V8h54.45v25.5h-10.73v94.5h-33l-30-60v34.5h10.73v25.5h-54.45v-25.5h10.73V33.5h-10.73V8Z" />
      <path fill={shadow} fillRule="evenodd" d="M444.72,40.07l-6.56-6.56V8h54.45l6.56,6.56v25.5h-10.73v77.5l-17,17h-52l-23.56-23.56v-32.5h33l6.56,6.56v17.44h13.44v-62.44h-4.16Z" />
      <path fill={face} fillRule="evenodd" d="M438.15,8h54.45v25.5h-10.73v77.5l-17,17h-52l-17-17v-32.5h33v24h20V33.5h-10.73V8Z" />
      <path fill={shadow} fillRule="evenodd" d="M504.61,8h54.45l6.56,6.56v25.5h-10.73v62.44h26.89v-62.44h-4.16l-6.56-6.56V8h54.45l6.56,6.56v25.5h-10.73v77.5l-17,17h-65.45l-23.56-23.56V40.07h-4.16l-6.56-6.56V8Z" />
      <path fill={face} fillRule="evenodd" d="M504.61,8h54.45v25.5h-10.73v69h33.45V33.5h-10.73V8h54.45v25.5h-10.73v77.5l-17,17h-65.45l-17-17V33.5h-10.73V8Z" />
      <path fill={shadow} fillRule="evenodd" d="M637.51,102.5h10.73l27.56-94.5h44.25l6.56,6.56,25.65,87.94h6.08l6.56,6.56v25.5h-55.83l-6.56-6.56v-25.5h10.73l-1.59-5.44h-18.98l-1.59,5.44h2.25l6.56,6.56v25.5h-55.83l-6.56-6.56v-25.5ZM706.24,78.5l-4.07-13.97-4.07,13.97h8.15Z" />
      <path fill={face} fillRule="evenodd" d="M637.51,102.5h10.73l27.56-94.5h44.25l27.56,94.5h10.73v25.5h-55.83v-25.5h10.73l-3.5-12h-23.62l-3.5,12h10.73v25.5h-55.83v-25.5ZM706.24,78.5l-8.31-28.5-8.31,28.5h16.62Z" />
      <path fill={shadow} fillRule="evenodd" d="M770.34,8h43.73l6.56,6.56,23.44,46.88v-21.38h-4.16l-6.56-6.56V8h54.45l6.56,6.56v25.5h-10.73v94.5h-33l-6.56-6.56-23.44-46.88v21.38h4.16l6.56,6.56v25.5h-54.45l-6.56-6.56v-25.5h10.73v-62.44h-4.16l-6.56-6.56V8Z" />
      <path fill={face} fillRule="evenodd" d="M770.34,8h43.73l30,60v-34.5h-10.73V8h54.45v25.5h-10.73v94.5h-33l-30-60v34.5h10.73v25.5h-54.45v-25.5h10.73V33.5h-10.73V8Z" />
      <path fill={shadow} fillRule="evenodd" d="M923.36,40.07l-6.56-6.56V8h86.73l23.56,23.56v25.77l-17.23,17.23,19.23,19.23v23.77l-17,17h-88.73l-6.56-6.56v-25.5h10.73v-62.44h-4.16ZM987.52,57.5v-17.44h-20.44v17.44h20.44ZM989.52,102.5v-17.44h-22.44v17.44h22.44Z" />
      <path fill={face} fillRule="evenodd" d="M916.79,8h86.73l17,17v25.77l-17.23,17.23,19.23,19.23v23.77l-17,17h-88.73v-25.5h10.73V33.5h-10.73V8ZM960.52,57.5h27v-24h-27v24ZM960.52,102.5h29v-24h-29v24Z" />
      <path fill={shadow} fillRule="evenodd" d="M1034.52,25l17-17h62.5l23.56,23.56v86l-17,17h-62.5l-23.56-23.56V25ZM1098.02,40.07h-23.94v62.44h23.94v-62.44Z" />
      <path fill={face} fillRule="evenodd" d="M1051.52,8h62.5l17,17v86l-17,17h-62.5l-17-17V25l17-17ZM1067.52,102.5h30.5V33.5h-30.5v69Z" />
      <path fill={shadow} fillRule="evenodd" d="M1205.41,14.57v25.5h-10.73l10.64,36.47,19.99-68.53h26.75l6.56,6.56,18.07,61.97,10.64-36.47h-2.25l-6.56-6.56V8h55.83l6.56,6.56v25.5h-10.73l-27.56,94.5h-43.38l-6.56-6.56-9.76-33.47-11.68,40.03h-43.38l-6.56-6.56-25.65-87.94h-6.08l-6.56-6.56V8h55.83l6.56,6.56Z" />
      <path fill={face} fillRule="evenodd" d="M1143.02,8h55.83v25.5h-10.73l14.88,51,22.31-76.5h26.75l22.31,76.5,14.88-51h-10.73V8h55.83v25.5h-10.73l-27.56,94.5h-43.38l-14-48-14,48h-43.38l-27.56-94.5h-10.73V8Z" />
      <path fill={shadow} fillRule="evenodd" d="M1346.35,8h54.45l6.56,6.56v25.5h-10.73v62.44h23.94v-12h33l6.56,6.56v37.5h-107.23l-6.56-6.56v-25.5h10.73v-62.44h-4.16l-6.56-6.56V8Z" />
      <path fill={face} fillRule="evenodd" d="M1346.35,8h54.45v25.5h-10.73v69h30.5v-12h33v37.5h-107.23v-25.5h10.73V33.5h-10.73V8Z" />
    </svg>;
  },
);
