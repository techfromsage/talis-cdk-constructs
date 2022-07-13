class Route {
  constructor(event) {
    this.event = event;
  }

  async handle() {
    console.log("Route 4 processing event.");

    return {
      statusCode: 200,
      headers: {},
      body: "route 4",
    };
  }
}

module.exports.route = async (event) => {
  const route = new Route(event);
  return await route.handle();
};
